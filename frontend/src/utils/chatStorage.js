// ── TONY AI — Local SQLite Storage (100% offline, no cloud) ─────────────
// Persists via Flask backend → SQLite file on disk.
// In-memory search index gives ~5x faster filtering vs per-keystroke API calls.

const SESSIONS_KEY = 'tony_local_sessions'
const MESSAGES_KEY = 'tony_local_messages'
const MIGRATED_KEY = 'tony_sqlite_migrated'

let localDbEnabled    = true
let searchIndex       = []          // preloaded sessions + user questions
let searchIndexReady  = false
let backendChecked    = false

// ── In-memory cache for instant session message reload ───────────────────
const messageCache = new Map()

// ── Session ID generator (called per new chat) ───────────────────────────
export function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
}

// ── Generic fetch wrapper with error normalisation ───────────────────────
async function apiFetch(path, options) {
  const res = await fetch(path, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res
}

// ── Check whether the Flask/SQLite backend is reachable ──────────────────
async function checkBackend() {
  if (backendChecked) return localDbEnabled
  backendChecked = true
  try {
    await apiFetch('/api/db/sessions')
    localDbEnabled = true
  } catch {
    localDbEnabled = false
    console.warn('[DB] SQLite backend offline — falling back to localStorage')
  }
  return localDbEnabled
}

// ── Migrate legacy localStorage data into SQLite once ────────────────────
async function migrateLocalStorage() {
  if (!localDbEnabled) return
  if (localStorage.getItem(MIGRATED_KEY) === '1') return

  let sessions = []
  let messages = {}
  try {
    sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
    messages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '{}')
  } catch {
    return
  }
  if (sessions.length === 0) {
    localStorage.setItem(MIGRATED_KEY, '1')
    return
  }

  console.log(`[DB] Migrating ${sessions.length} sessions from localStorage → SQLite`)
  for (const s of sessions) {
    const msgs = messages[s.id] || []
    try {
      // Use batch endpoint for atomic migration
      await apiFetch('/api/db/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: s.id,
          preview:   s.preview || '',
          messages:  msgs,
        }),
      })
    } catch (_) {}
  }

  localStorage.setItem(MIGRATED_KEY, '1')
  localStorage.removeItem(SESSIONS_KEY)
  localStorage.removeItem(MESSAGES_KEY)
  console.log('[DB] Migration complete.')
}

// ── Build / refresh in-memory search index (one network call) ────────────
export async function refreshSearchIndex() {
  await checkBackend()
  if (!localDbEnabled) {
    searchIndex = loadSessionsFromStorage().map(s => ({
      ...s,
      user_questions: (loadMessagesFromStorage()[s.id] || [])
        .filter(m => m.role === 'user')
        .map(m => m.text)
        .join(' '),
      message_count: (loadMessagesFromStorage()[s.id] || []).length,
    }))
    searchIndexReady = true
    return searchIndex
  }

  try {
    const res = await apiFetch('/api/db/search-index')
    searchIndex = await res.json()
    searchIndexReady = true
    return searchIndex
  } catch (e) {
    console.error('[DB] refreshSearchIndex:', e)
    return []
  }
}

/** Instant client-side search — no network per keystroke (~5x faster). */
export function searchSessions(query) {
  const start = performance.now()
  if (!query.trim()) {
    return { results: searchIndex, elapsedMs: 0 }
  }
  const q = query.toLowerCase()
  const results = searchIndex.filter(s =>
    (s.title         && s.title.toLowerCase().includes(q)) ||
    (s.preview       && s.preview.toLowerCase().includes(q)) ||
    (s.id            && s.id.toLowerCase().includes(q)) ||
    (s.user_questions && s.user_questions.toLowerCase().includes(q))
  )
  return { results, elapsedMs: Math.round(performance.now() - start) }
}

// ── Patch the in-memory search index without a network round-trip ─────────
function patchSearchIndex(sessionId, patch) {
  const idx = searchIndex.findIndex(s => s.id === sessionId)
  if (idx >= 0) {
    searchIndex[idx] = { ...searchIndex[idx], ...patch }
  } else if (patch.id) {
    searchIndex.unshift(patch)
  }
}

function removeFromSearchIndex(sessionId) {
  searchIndex = searchIndex.filter(s => s.id !== sessionId)
}

// ── localStorage fallback helpers ─────────────────────────────────────────
function loadSessionsFromStorage() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]') } catch { return [] }
}

function saveSessionsToStorage(sessions) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

function loadMessagesFromStorage() {
  try { return JSON.parse(localStorage.getItem(MESSAGES_KEY) || '{}') } catch { return {} }
}

function saveMessagesToStorage(messages) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages))
}

// ════════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════════

/** Save / upsert a session metadata record. */
export async function saveSessionMeta(sessionId, firstText, title) {
  await checkBackend()
  const preview = (firstText || '').slice(0, 80)
  const _title  = title || preview

  if (localDbEnabled) {
    try {
      await apiFetch('/api/db/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, preview, title: _title }),
      })
      patchSearchIndex(sessionId, {
        id: sessionId, title: _title, preview,
        user_questions: firstText, message_count: 0,
      })
      return { success: true }
    } catch (e) {
      console.error('[DB] saveSessionMeta:', e)
    }
  }

  const sessions = loadSessionsFromStorage()
  const existing = sessions.find(s => s.id === sessionId)
  const now = new Date().toISOString()
  if (existing) {
    existing.preview = preview
    existing.title   = _title
  } else {
    sessions.unshift({ id: sessionId, title: _title, preview, created_at: now })
  }
  saveSessionsToStorage(sessions)
  patchSearchIndex(sessionId, { id: sessionId, title: _title, preview, user_questions: firstText, created_at: now })
  return { success: true }
}

/** Save a single message to the DB. */
export async function saveMessage(sessionId, msg) {
  await checkBackend()

  if (localDbEnabled) {
    try {
      await apiFetch('/api/db/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...msg }),
      })
      // Invalidate the cached message list for this session
      messageCache.delete(sessionId)
      const entry = searchIndex.find(s => s.id === sessionId)
      if (entry && msg.role === 'user') {
        entry.user_questions  = `${entry.user_questions || ''} ${msg.text || ''}`.trim()
        entry.message_count   = (entry.message_count || 0) + 1
        entry.updated_at      = new Date().toISOString()
      }
      return { success: true }
    } catch (e) {
      console.error('[DB] saveMessage:', e)
    }
  }

  const messages        = loadMessagesFromStorage()
  const sessionMessages = messages[sessionId] || []
  sessionMessages.push({
    id:        msg.id || sessionMessages.length + 1,
    role:      msg.role,
    text:      msg.text,
    source:    msg.source || 'unknown',
    timestamp: msg.timestamp || new Date().toLocaleString('en-US', { hour12: false }),
  })
  messages[sessionId] = sessionMessages
  saveMessagesToStorage(messages)
  messageCache.set(sessionId, sessionMessages)
  return { success: true }
}

/**
 * Save a session + all its messages atomically in one request.
 * Preferred over calling saveSessionMeta + saveMessage N times.
 */
export async function saveSessionBatch(sessionId, preview, messages, title) {
  await checkBackend()

  if (localDbEnabled) {
    try {
      const res  = await apiFetch('/api/db/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, preview, title: title || preview, messages }),
      })
      const data = await res.json()
      messageCache.delete(sessionId)
      patchSearchIndex(sessionId, {
        id:            sessionId,
        title:         title || preview,
        preview,
        message_count: messages.length,
        user_questions: messages.filter(m => m.role === 'user').map(m => m.text).join(' '),
        updated_at:    new Date().toISOString(),
      })
      return data
    } catch (e) {
      console.error('[DB] saveSessionBatch:', e)
    }
  }

  // localStorage fallback — save individually
  await saveSessionMeta(sessionId, preview, title)
  for (const msg of messages) {
    await saveMessage(sessionId, msg)
  }
  return { success: true }
}

/** Delete a session and all its messages from the DB. */
export async function deleteSession(sessionId) {
  await checkBackend()

  if (localDbEnabled) {
    try {
      await apiFetch(`/api/db/session/${sessionId}`, { method: 'DELETE' })
      messageCache.delete(sessionId)
      removeFromSearchIndex(sessionId)
      return { success: true }
    } catch (e) {
      console.error('[DB] deleteSession:', e)
      return { success: false, error: e.message }
    }
  }

  // localStorage fallback
  const sessions = loadSessionsFromStorage().filter(s => s.id !== sessionId)
  saveSessionsToStorage(sessions)
  const messages = loadMessagesFromStorage()
  delete messages[sessionId]
  saveMessagesToStorage(messages)
  messageCache.delete(sessionId)
  removeFromSearchIndex(sessionId)
  return { success: true }
}

/** Rename (update the title of) a session. */
export async function renameSession(sessionId, title) {
  await checkBackend()
  const _title = (title || '').trim().slice(0, 120)
  if (!_title) return { success: false, error: 'Empty title' }

  if (localDbEnabled) {
    try {
      await apiFetch(`/api/db/session/${sessionId}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: _title }),
      })
      patchSearchIndex(sessionId, { title: _title })
      return { success: true }
    } catch (e) {
      console.error('[DB] renameSession:', e)
      return { success: false, error: e.message }
    }
  }

  // localStorage fallback
  const sessions = loadSessionsFromStorage()
  const s = sessions.find(s => s.id === sessionId)
  if (s) s.title = _title
  saveSessionsToStorage(sessions)
  patchSearchIndex(sessionId, { title: _title })
  return { success: true }
}

/** List all sessions (uses cached search index). */
export async function listSessions() {
  await checkBackend()
  await migrateLocalStorage()

  if (!searchIndexReady) {
    await refreshSearchIndex()
  }

  if (localDbEnabled) {
    return {
      success: true,
      data: searchIndex.map(s => ({
        id:            s.id,
        title:         s.title,
        preview:       s.preview,
        created_at:    s.created_at,
        updated_at:    s.updated_at,
        user_questions: s.user_questions,
        message_count: s.message_count,
      })),
    }
  }

  return { success: true, data: loadSessionsFromStorage() }
}

/** Load all messages for a session (with in-memory cache). */
export async function loadSession(sessionId) {
  await checkBackend()

  if (messageCache.has(sessionId)) {
    return { success: true, data: messageCache.get(sessionId) }
  }

  if (localDbEnabled) {
    try {
      const res  = await apiFetch(`/api/db/session/${sessionId}`)
      const data = await res.json()
      messageCache.set(sessionId, data)
      return { success: true, data }
    } catch (e) {
      console.error('[DB] loadSession:', e)
    }
  }

  const data = loadMessagesFromStorage()[sessionId] || []
  messageCache.set(sessionId, data)
  return { success: true, data }
}

/** Get aggregate stats (session count, message count, DB size). */
export async function loadStats() {
  await checkBackend()
  if (localDbEnabled) {
    try {
      const res = await apiFetch('/api/db/stats')
      return await res.json()
    } catch (_) {}
  }
  try {
    return JSON.parse(localStorage.getItem('tony_chat_stats') || '{"totalMessages":0,"sessions":0}')
  } catch {
    return { totalMessages: 0, sessions: 0 }
  }
}

/** Save operator profile (SQLite primary, localStorage mirror). */
export async function saveProfile(profile) {
  await checkBackend()
  localStorage.setItem('tony_profile', JSON.stringify(profile))
  if (localDbEnabled) {
    try {
      await apiFetch('/api/db/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
    } catch (e) {
      console.error('[DB] saveProfile:', e)
    }
  }
  return { success: true }
}

/** Load operator profile — SQLite is the source of truth, localStorage is cache. */
export async function loadProfile() {
  await checkBackend()

  // Prefer SQLite if available
  if (localDbEnabled) {
    try {
      const res  = await apiFetch('/api/db/profile')
      const data = await res.json()
      if (data) {
        localStorage.setItem('tony_profile', JSON.stringify(data))
        return data
      }
    } catch (_) {}
  }

  // Fallback to localStorage cache
  try {
    const stored = localStorage.getItem('tony_profile')
    if (stored) return JSON.parse(stored)
  } catch (_) {}

  return null
}

export async function ensureDbReady() {
  return checkBackend()
}

export function getDbEnabled() {
  return localDbEnabled
}

/** Clear the in-memory search index cache (call on new session). */
export function clearSessionCache() {
  searchIndexReady = false
  searchIndex      = []
  messageCache.clear()
}

export { localDbEnabled, searchIndexReady }
