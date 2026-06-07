// ── TONY AI API UTILS ─────────────────────────────────────────────────────────
// Routes:
//   /api/chat          → FastAPI port 8000  (RAG-powered, session memory)
//                      falls back to Flask port 5000 when FastAPI is unavailable
//   /api/system        → Flask   port 5000  (psutil stats)
//   /api/ollama_status → Flask   port 5000  (Ollama health)
//   /api/launch        → Flask   port 5000  (launch OS apps)
//   /api/action        → Flask   port 5000  (system actions)

const BASE = ''
const CHAT_FALLBACK = 'http://localhost:5000'

/**
 * Send a chat message to FastAPI RAG engine.
 * Falls back to Flask chat endpoint on port 5000 if FastAPI is unavailable.
 * @param {string} message
 * @param {string|null} session_id
 * @param {number[]|null} file_ids - list of uploaded file IDs for document context
 * @param {boolean} stream
 */
export const sendChat = async (message, session_id = null, file_ids = null, stream = false) => {
  const body = JSON.stringify({
    message,
    session_id: session_id || undefined,
    file_ids: file_ids && file_ids.length > 0 ? file_ids : undefined,
    stream,
    use_rag: true,
  })

  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }

  try {
    const res = await fetch(`${BASE}/api/chat`, requestOptions)
    if (!res.ok) throw new Error(`Chat API error ${res.status}`)
    return await res.json()
  } catch (error) {
    const fallbackRes = await fetch(`${CHAT_FALLBACK}/api/chat`, requestOptions)
    if (!fallbackRes.ok) throw new Error(`Fallback chat API error ${fallbackRes.status}`)
    return await fallbackRes.json()
  }
}

export const getSystemStats = () =>
  fetch(`${BASE}/api/system`).then(r => r.json())

export const getOllamaStatus = () =>
  fetch(`${BASE}/api/ollama_status`).then(r => r.json())

export const launchApp = (app) =>
  fetch(`${BASE}/api/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app })
  }).then(r => r.json())

export const doSystemAction = (action) =>
  fetch(`${BASE}/api/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  }).then(r => r.json())

// ── Document upload ────────────────────────────────────────────────────────────
export const uploadDocument = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}/api/upload`)
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)) }
        catch { reject(new Error('Invalid JSON')) }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(form)
  })
}

// ── File listing ───────────────────────────────────────────────────────────────
export const listDocuments = () =>
  fetch(`${BASE}/api/files`).then(r => r.json())

export const deleteDocument = (id) =>
  fetch(`${BASE}/api/file/${id}`, { method: 'DELETE' }).then(r => r.json())

export const getDocumentDetail = (id) =>
  fetch(`${BASE}/api/file/${id}`).then(r => r.json())

// ── Platform health ────────────────────────────────────────────────────────────
export const getHealth = () =>
  fetch(`${BASE}/api/health`).then(r => r.json())

export const getPlatformStats = () =>
  fetch(`${BASE}/api/stats`).then(r => r.json())

