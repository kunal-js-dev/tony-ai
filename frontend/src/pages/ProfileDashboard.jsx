import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  listSessions,
  loadSession,
  saveProfile,
  refreshSearchIndex,
  searchSessions,
  loadStats,
  ensureDbReady,
  deleteSession,
  renameSession,
} from '../utils/chatStorage'
import { useTheme, THEMES } from '../context/ThemeContext'

const AVATAR_OPTIONS = ['⚡','🤖','👾','🦾','🧠','🔮','⚙️','🛸']

const DEFAULT_PROFILE = {
  name:     'BOSS',
  title:    'SYSTEM ADMINISTRATOR',
  avatar:   '⚡',
  bio:      'Running TONY AI offline system.',
  joinDate: new Date().toISOString().split('T')[0],
}

// ── Small helper: info row ───────────────────────────────────────────────────
function IRow({ label, val, accent, red }) {
  const color = accent ? 'var(--g)' : red ? 'var(--r)' : undefined
  return (
    <div className="irow" style={{ padding:'4px 0', borderBottom:'1px solid var(--bdr)' }}>
      <span className="ik">{label}</span>
      <span className="iv" style={color ? { color } : {}}>{val}</span>
    </div>
  )
}

// ── Blink-dot loading indicator ──────────────────────────────────────────────
function LoadingDot({ label = 'LOADING...' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 0', fontFamily:'var(--mono)', fontSize:9, color:'var(--dim)', letterSpacing:2 }}>
      <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--c)', animation:'blink 1s infinite' }}/>
      {label}
    </div>
  )
}

// ── Bar-sweep skeleton (for stats counters) ──────────────────────────────────
function SkeletonBar() {
  return (
    <div style={{
      height:22, borderRadius:2,
      background:'linear-gradient(90deg, var(--bdr) 25%, rgba(0,212,255,0.08) 50%, var(--bdr) 75%)',
      backgroundSize:'200% 100%',
      animation:'barsweep 1.4s infinite',
    }}/>
  )
}

// ── Inline rename input ───────────────────────────────────────────────────────
function RenameInput({ defaultValue, onSave, onCancel }) {
  const [val, setVal] = useState(defaultValue || '')
  const ref           = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  const submit = () => { if (val.trim()) onSave(val.trim()) }
  return (
    <input
      ref={ref}
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter')  { e.preventDefault(); submit() }
        if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      }}
      style={{
        background: 'var(--input-bg)', border: '1px solid var(--c)',
        color: 'var(--txt)', fontFamily: 'var(--mono)', fontSize: 9,
        padding: '3px 8px', outline: 'none', width: '100%',
      }}
    />
  )
}

export default function ProfileDashboard({ stats, ollamaStatus, onResume }) {
  const { themeId, setThemeId } = useTheme()

  // ── Profile state ─────────────────────────────────────────────────────────
  const [profile,   setProfile]   = useState(DEFAULT_PROFILE)
  const [editing,   setEditing]   = useState(false)
  const [editBuf,   setEditBuf]   = useState({ ...DEFAULT_PROFILE })
  const [fbSynced,  setFbSynced]  = useState(false)

  // ── Session / history state ───────────────────────────────────────────────
  const [sessions,      setSessions]      = useState([])
  const [searchQuery,   setSearchQuery]   = useState('')
  const [expandedId,    setExpandedId]    = useState(null)
  const [sessionMsgs,   setSessionMsgs]   = useState({})
  const [loadingSession,setLoadingSession]= useState(null)
  const [loadingDB,     setLoadingDB]     = useState(false)
  const [dbOnline,      setDbOnline]      = useState(true)

  // ── Rename state ──────────────────────────────────────────────────────────
  const [renamingId,    setRenamingId]    = useState(null)
  const [renameSaving,  setRenameSaving]  = useState(false)

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deletingId,    setDeletingId]    = useState(null)  // which session is being deleted

  // ── Stats state ───────────────────────────────────────────────────────────
  const [statsData,    setStatsData]    = useState({ totalMessages: 0, sessions: 0, dbSizeKb: 0 })
  const [statsLoading, setStatsLoading] = useState(false)

  // ── Export state ──────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)

  // ─────────────────────────────────────────────────────────────────────────
  // MOUNT: load profile and sessions
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem('tony_profile') || 'null')
        if (stored) { setProfile(stored); setEditBuf(stored) }
      } catch (_) {}
    }

    const loadSessionsAndStats = async () => {
      setLoadingDB(true)
      const online = await ensureDbReady()
      setDbOnline(online)
      try {
        await refreshSearchIndex()
        const resp = await listSessions()
        if (resp?.success) setSessions(resp.data || [])
      } catch (_) {}
      finally { setLoadingDB(false) }

      setStatsLoading(true)
      try {
        const s = await loadStats()
        setStatsData(s)
      } catch (_) {}
      finally { setStatsLoading(false) }
    }

    loadProfileData()
    loadSessionsAndStats()

    // Reload when tab becomes visible again
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshSearchIndex()
          .then(() => listSessions())
          .then(resp => { if (resp?.success) setSessions(resp.data || []) })
        loadStats().then(setStatsData).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ── Save profile ─────────────────────────────────────────────────────────
  const handleSaveProfile = useCallback(async () => {
    setProfile(editBuf)
    setEditing(false)
    try { localStorage.setItem('tony_profile', JSON.stringify(editBuf)) } catch (_) {}
    try { await saveProfile(editBuf) } catch (_) {}
    setFbSynced(true)
    setTimeout(() => setFbSynced(false), 2000)
  }, [editBuf])

  // ── Expand/collapse session row ───────────────────────────────────────────
  const handleSessionClick = useCallback(async (id) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (sessionMsgs[id]) return // already cached
    setLoadingSession(id)
    try {
      const result   = await loadSession(id)
      const messages = result?.success ? result.data : []
      setSessionMsgs(prev => ({ ...prev, [id]: messages }))
    } catch (_) {}
    setLoadingSession(null)
  }, [expandedId, sessionMsgs])

  // ── Resume handler ────────────────────────────────────────────────────────
  const handleResume = useCallback(() => {
    const msgs = sessionMsgs[expandedId]
    if (msgs && msgs.length > 0 && onResume) onResume(expandedId, msgs)
  }, [expandedId, sessionMsgs, onResume])

  // ── Delete a session ──────────────────────────────────────────────────────
  const handleDelete = useCallback(async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Delete this session and all its messages?')) return
    setDeletingId(id)
    try {
      await deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (expandedId === id) setExpandedId(null)
      setSessionMsgs(prev => { const n = {...prev}; delete n[id]; return n })
      // Refresh stats
      loadStats().then(setStatsData).catch(() => {})
    } catch (_) {}
    setDeletingId(null)
  }, [expandedId])

  // ── Rename a session ──────────────────────────────────────────────────────
  const handleRename = useCallback(async (id, newTitle) => {
    setRenameSaving(true)
    try {
      await renameSession(id, newTitle)
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s))
    } catch (_) {}
    setRenameSaving(false)
    setRenamingId(null)
  }, [])

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/db/export')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'tony_export.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (_) {}
    setExporting(false)
  }, [])

  // ── Instant in-memory search ──────────────────────────────────────────────
  const { filteredSessions, searchMs: searchElapsedMs } = useMemo(() => {
    const { results, elapsedMs } = searchSessions(searchQuery)
    return { filteredSessions: results, searchMs: elapsedMs }
  }, [sessions, searchQuery])

  const formatUptime = (hours) => {
    if (hours == null) return 'N/A'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  const parseDate = (ts) => {
    if (!ts) return ''
    return new Date(ts).toLocaleDateString()
  }

  return (
    <div style={{ display:'flex', height:'100vh', flexDirection:'column', animation:'pageIn .3s ease', padding:5, gap:5, overflowY:'auto' }}>

      {/* ── Header ── */}
      <div className="panel" style={{ flexShrink:0, border:'none', borderBottom:'1px solid var(--bdr)', background:'rgba(0,5,15,0.92)', padding:'0 18px', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:20, color:'var(--c)', letterSpacing:5, textShadow:'0 0 16px rgba(0,212,255,0.6)' }}>OPERATOR PROFILE</div>
          {fbSynced && (
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--g)', letterSpacing:2, padding:'3px 10px', border:'1px solid var(--g)', background:'rgba(0,255,136,0.06)', animation:'fadeIn 0.2s ease' }}>
              ✓ PROFILE SAVED
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {/* Theme Switcher — compact swatches */}
          <div style={{ display:'flex', gap:3, padding:'5px 8px', border:'1px solid var(--bdr)', background:'rgba(0,0,0,0.2)', borderRadius: 4, alignItems:'center' }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:7, letterSpacing:2, color:'var(--dim)', marginRight:3 }}>THEME</span>
            {Object.values(THEMES).map(t => (
              <button key={t.id}
                onClick={() => setThemeId(t.id)}
                title={`${t.label} — ${t.description}`}
                style={{
                  width: 20, height: 20, borderRadius: '50%', border: `2px solid ${themeId === t.id ? t.accent : 'rgba(255,255,255,0.15)'}`,
                  background: `radial-gradient(circle at 35% 35%, ${t.accent}cc, ${t.accent}44)`,
                  cursor: 'pointer', padding: 0, outline: 'none',
                  boxShadow: themeId === t.id ? `0 0 8px ${t.accent}88` : 'none',
                  transition: 'all 0.15s', transform: themeId === t.id ? 'scale(1.2)' : 'scale(1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9,
                }}
                onMouseEnter={e => { if (themeId !== t.id) { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.borderColor = `${t.accent}80` } }}
                onMouseLeave={e => { if (themeId !== t.id) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' } }}
              >
                {themeId === t.id ? t.icon : ''}
              </button>
            ))}
          </div>
          {dbOnline && (
            <button
              className="btn"
              onClick={handleExport}
              disabled={exporting}
              style={{ fontSize:8, padding:'4px 10px', color:'var(--g)', borderColor:'var(--g)' }}
              title="Export all conversations as JSON"
            >
              {exporting ? '…' : '⬇ EXPORT'}
            </button>
          )}
          <button className="btn primary" onClick={() => { setEditBuf({...profile}); setEditing(e=>!e) }}>
            {editing ? '✕ CANCEL' : '✎ EDIT'}
          </button>
        </div>
      </div>

      {/* ── Body grid ── */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'300px 1fr', gridTemplateRows:'auto 1fr', gap:5 }}>

        {/* ═══ LEFT COLUMN ═══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>

          {/* Avatar + identity */}
          <div className="panel" style={{ padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>

            {/* Avatar circle */}
            <div style={{
              width:80, height:80, borderRadius:'50%',
              border:'2px solid var(--c)',
              background:'linear-gradient(135deg,rgba(0,212,255,0.08),rgba(0,30,80,0.2))',
              boxShadow:'0 0 24px rgba(0,212,255,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:36, cursor: editing ? 'pointer' : 'default',
              position:'relative'
            }}>
              {profile.avatar}
              {editing && (
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontFamily:'var(--mono)', color:'var(--c)', letterSpacing:1 }}>CHANGE</div>
              )}
            </div>

            {/* Avatar picker */}
            {editing && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
                {AVATAR_OPTIONS.map(a => (
                  <button key={a} onClick={() => setEditBuf(p => ({...p, avatar:a}))}
                    style={{ width:36, height:36, borderRadius:'50%', border:`2px solid ${editBuf.avatar===a?'var(--c)':'var(--bdr)'}`, background:'transparent', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {a}
                  </button>
                ))}
              </div>
            )}

            {!editing ? (
              <>
                <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700, color:'var(--c)', letterSpacing:3, textShadow:'0 0 12px rgba(0,212,255,0.4)' }}>{profile.name}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:3, color:'var(--dim)' }}>{profile.title}</div>
                <div style={{ fontFamily:'var(--sans)', fontSize:11, color:'var(--txt)', textAlign:'center', opacity:0.7, lineHeight:1.5, marginTop:4 }}>{profile.bio}</div>
              </>
            ) : (
              <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { key:'name',  label:'CALLSIGN', placeholder:'Your name' },
                  { key:'title', label:'TITLE',    placeholder:'Your title' },
                  { key:'bio',   label:'BIO',      placeholder:'Brief bio', multiline:true },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:7.5, letterSpacing:2, color:'var(--dim)', marginBottom:3 }}>{f.label}</div>
                    {f.multiline ? (
                      <textarea value={editBuf[f.key]} onChange={e => setEditBuf(p => ({...p, [f.key]:e.target.value}))}
                        rows={2} placeholder={f.placeholder}
                        style={{ width:'100%', background:'var(--input-bg)', border:'1px solid var(--input-border)', color:'var(--txt)', fontFamily:'var(--mono)', fontSize:11, padding:'6px 10px', resize:'none', outline:'none' }}/>
                    ) : (
                      <input value={editBuf[f.key]} onChange={e => setEditBuf(p => ({...p, [f.key]:e.target.value}))}
                        placeholder={f.placeholder}
                        style={{ width:'100%', background:'var(--input-bg)', border:'1px solid var(--input-border)', color:'var(--txt)', fontFamily:'var(--mono)', fontSize:11, padding:'6px 10px', outline:'none' }}/>
                    )}
                  </div>
                ))}
                <button className="btn primary" onClick={handleSaveProfile} style={{ width:'100%', marginTop:4, justifyContent:'center' }}>
                  ✓ SAVE PROFILE
                </button>
              </div>
            )}

            {!editing && (
              <div style={{ width:'100%', paddingTop:10, borderTop:'1px solid var(--bdr)' }}>
                <IRow label="SINCE"  val={profile.joinDate}/>
                <IRow label="ENGINE" val={ollamaStatus?.online ? 'OLLAMA' : 'FALLBACK'} accent={ollamaStatus?.online}/>
                <IRow label="STATUS" val="OPERATIONAL" accent/>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="panel" style={{ padding:16 }}>
            <div className="section-label">STATISTICS</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:8 }}>
              {[
                { label:'MESSAGES',  val: statsLoading ? null : statsData.totalMessages },
                { label:'SESSIONS',  val: statsLoading ? null : statsData.sessions },
                { label:'DB SIZE',   val: statsLoading ? null : (statsData.dbSizeKb ? `${statsData.dbSizeKb}KB` : '—') },
                { label:'MODELS',    val: ollamaStatus?.models?.length || 0 },
              ].map(s => (
                <div key={s.label} style={{ padding:'10px 12px', border:'1px solid var(--bdr)', background:'var(--panel-bg)' }}>
                  <div className="metric-label">{s.label}</div>
                  {s.val === null ? (
                    <SkeletonBar/>
                  ) : (
                    <div className="metric-val" style={{ fontSize:22 }}>{s.val}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Machine Identity */}
          <div className="panel" style={{ padding:16 }}>
            <div className="section-label" style={{ display:'flex', alignItems:'center', gap:8 }}>
              MACHINE IDENTITY
              {stats && (
                <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--g)', letterSpacing:2, padding:'1px 6px', border:'1px solid var(--g)', background:'rgba(0,255,136,0.06)', marginLeft:8 }}>
                  ● LIVE
                </span>
              )}
            </div>
            {stats ? (
              <div style={{ marginTop:8 }}>
                <IRow label="CPU MODEL" val={stats.cpu_model   || 'N/A'}/>
                <IRow label="OS"        val={stats.os          || 'N/A'}/>
                <IRow label="HOSTNAME"  val={stats.hostname    || 'N/A'}/>
                <IRow label="CORES"     val={stats.cpu_cores != null ? `${stats.cpu_cores}` : 'N/A'}/>
                <IRow label="RAM"       val={stats.ram_total_gb != null ? `${stats.ram_total_gb}GB` : 'N/A'}/>
                <IRow label="UPTIME"    val={formatUptime(stats.uptime_hours)}/>
              </div>
            ) : (
              <LoadingDot label="CONNECTING TO BACKEND..."/>
            )}
          </div>
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>

          {/* ── Interface Theme ── */}
          <div className="panel" style={{ padding: 18 }}>
            <div className="ck tl"/><div className="ck tr"/>
            <div className="section-label">INTERFACE THEME</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 10 }}>
              {Object.values(THEMES).map(t => {
                const isActive = themeId === t.id
                return (
                  <button key={t.id}
                    id={`profile-theme-${t.id}`}
                    onClick={() => setThemeId(t.id)}
                    style={{
                      padding: '12px 10px',
                      border: `1.5px solid ${isActive ? t.accent : 'var(--bdr)'}`,
                      borderRadius: 6,
                      background: isActive ? `${t.accent}12` : 'transparent',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                      boxShadow: isActive ? `0 0 18px ${t.accent}28, inset 0 0 8px ${t.accent}08` : 'none',
                      transition: 'all 0.2s',
                      outline: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = `${t.accent}60`
                        e.currentTarget.style.background = `${t.accent}08`
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'var(--bdr)'
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    {/* Shimmer on active */}
                    {isActive && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                        background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
                        opacity: 0.8,
                      }}/>
                    )}
                    {/* Color swatch */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%, ${t.accent}dd, ${t.accent}55)`,
                      boxShadow: isActive ? `0 0 10px ${t.accent}88, 0 0 20px ${t.accent}44` : `0 2px 4px rgba(0,0,0,0.3)`,
                      border: `1px solid ${t.accent}60`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13,
                      transition: 'all 0.2s',
                    }}>
                      {t.icon}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 2, color: isActive ? t.accent : 'var(--dim)', fontWeight: isActive ? 700 : 400, transition: 'color 0.2s' }}>
                      {t.label}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 6.5, letterSpacing: 0.5, color: 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.3 }}>
                      {t.description}
                    </div>
                    {isActive && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: t.accent, letterSpacing: 1.5 }}>● ACTIVE</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Conversation History Browser ── */}
          <div className="panel" style={{ padding:18, flex:1, display:'flex', flexDirection:'column' }}>
            <div className="ck tl"/><div className="ck tr"/>
            <div className="section-label" style={{ display:'flex', alignItems:'center' }}>
              CONVERSATION HISTORY
              <span style={{ marginLeft:'auto', padding:'1px 6px', border:'1px solid var(--bdr)', fontSize:7, color: dbOnline ? 'var(--g)' : 'var(--y)' }}>
                {dbOnline ? '● LOCAL SQLITE' : '○ BROWSER ONLY'}
              </span>
            </div>

            {/* Search input */}
            <div style={{ margin: '14px 0 10px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search your past conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1, padding: '8px 12px', background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)', color: 'var(--txt)',
                  fontFamily: 'var(--mono)', fontSize: 11, outline: 'none'
                }}
              />
              {searchQuery.trim() && (
                <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--g)', letterSpacing:1, whiteSpace:'nowrap' }}>
                  {filteredSessions.length} hit{filteredSessions.length !== 1 ? 's' : ''} · {searchElapsedMs}ms
                </span>
              )}
            </div>

            {!dbOnline ? (
              <div style={{ padding:'20px 0', textAlign:'center' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--y)', letterSpacing:2, marginBottom:10 }}>SQLITE BACKEND OFFLINE</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--dim)', lineHeight:1.8, maxWidth:400, margin:'0 auto' }}>
                  Start the Flask backend to persist chats locally:<br/>
                  <span style={{ color:'var(--c)' }}>python backend/app.py</span><br/><br/>
                  Currently using <span style={{ color:'var(--y)' }}>browser storage only</span> — data stays on this device, not in the cloud.
                </div>
              </div>
            ) : loadingDB ? (
              <LoadingDot label="LOADING FROM SQLITE..."/>
            ) : filteredSessions.length === 0 ? (
              <div style={{ padding:20, fontFamily:'var(--mono)', fontSize:10, color:'var(--dim)', textAlign:'center', letterSpacing:2 }}>
                {searchQuery ? 'NO MATCHING SESSIONS FOUND' : 'NO SESSIONS FOUND'}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:8, overflowY:'auto', flex: 1 }}>
                {filteredSessions.map((s) => (
                  <div key={s.id} style={{ border: expandedId === s.id ? '1px solid var(--c)' : '1px solid var(--bdr)', background:'var(--panel-bg)', transition:'border-color 0.2s', opacity: deletingId === s.id ? 0.4 : 1 }}>

                    {/* Session header row */}
                    <div
                      onClick={() => renamingId !== s.id && handleSessionClick(s.id)}
                      style={{ padding:'10px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', cursor: renamingId === s.id ? 'default' : 'pointer' }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--dim)', letterSpacing:1, userSelect:'none', flexShrink:0 }}>
                          {expandedId === s.id ? '▼' : '▶'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          {/* Title / rename input */}
                          {renamingId === s.id ? (
                            <div onClick={e => e.stopPropagation()} style={{ display:'flex', gap:6, alignItems:'center' }}>
                              <RenameInput
                                defaultValue={s.title || s.preview || ''}
                                onSave={(t) => handleRename(s.id, t)}
                                onCancel={() => setRenamingId(null)}
                              />
                              <button
                                className="btn"
                                onClick={e => { e.stopPropagation(); handleRename(s.id, s.title || s.preview || '') }}
                                style={{ fontSize:7, padding:'3px 8px', flexShrink:0 }}
                                disabled={renameSaving}
                              >✓</button>
                              <button
                                className="btn"
                                onClick={e => { e.stopPropagation(); setRenamingId(null) }}
                                style={{ fontSize:7, padding:'3px 8px', flexShrink:0 }}
                              >✕</button>
                            </div>
                          ) : (
                            <>
                              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--c)', letterSpacing:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {s.title || `…${s.id.slice(-10).toUpperCase()}`}
                              </div>
                              <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--dim)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {s.preview || 'No preview'}
                                {searchQuery.trim() && s.user_questions && s.user_questions.toLowerCase().includes(searchQuery.toLowerCase()) && (
                                  <span style={{ display:'block', color:'var(--g)', marginTop:2, opacity:0.85 }}>
                                    ↳ matched question
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right side: date + msg count + action buttons */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, marginLeft:8 }}>
                        {s.message_count > 0 && (
                          <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--dim)', padding:'1px 5px', border:'1px solid var(--bdr)' }}>
                            {s.message_count} msg{s.message_count !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--dim)' }}>
                          {s.updated_at ? parseDate(s.updated_at) : parseDate(s.created_at)}
                        </span>
                        {/* Rename button */}
                        <button
                          onClick={e => { e.stopPropagation(); setRenamingId(s.id); setExpandedId(null) }}
                          className="btn"
                          title="Rename session"
                          style={{ fontSize:8, padding:'2px 6px', color:'var(--c)', borderColor:'var(--bdr)' }}
                        >✎</button>
                        {/* Delete button */}
                        <button
                          onClick={e => handleDelete(e, s.id)}
                          className="btn danger"
                          title="Delete session"
                          disabled={deletingId === s.id}
                          style={{ fontSize:8, padding:'2px 6px' }}
                        >🗑</button>
                      </div>
                    </div>

                    {/* Expanded messages panel */}
                    {expandedId === s.id && (
                      <div style={{ borderTop:'1px solid var(--bdr)', background:'rgba(0,212,255,0.02)' }}>
                        {loadingSession === s.id ? (
                          <div style={{ padding:'10px 14px' }}>
                            <LoadingDot label="FETCHING MESSAGES..."/>
                          </div>
                        ) : sessionMsgs[s.id] && sessionMsgs[s.id].length > 0 ? (
                          <>
                            <div style={{ maxHeight:240, overflowY:'auto', display:'flex', flexDirection:'column', gap:0 }}>
                              {sessionMsgs[s.id].map((msg, i) => (
                                <div key={msg.id || i}
                                  style={{ padding:'8px 14px', borderBottom:'1px solid rgba(0,212,255,0.06)', display:'flex', gap:10, alignItems:'flex-start' }}>
                                  {/* Role badge */}
                                  <div style={{
                                    fontFamily:'var(--mono)', fontSize:7, letterSpacing:1.5,
                                    padding:'2px 6px', flexShrink:0, marginTop:1,
                                    border:`1px solid ${msg.role==='ai' ? 'var(--c)' : 'var(--y)'}`,
                                    color: msg.role==='ai' ? 'var(--c)' : 'var(--y)',
                                    background: msg.role==='ai' ? 'rgba(0,212,255,0.05)' : 'rgba(255,214,10,0.05)',
                                  }}>
                                    {msg.role === 'ai' ? 'AI' : 'YOU'}
                                  </div>
                                  <div style={{ flex:1 }}>
                                    {msg.timestamp && (
                                      <div style={{ fontFamily:'var(--mono)', fontSize:7, color:'var(--dim)', marginBottom:3 }}>
                                        {msg.timestamp}
                                      </div>
                                    )}
                                    <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--txt)', lineHeight:1.5, opacity:0.85 }}>
                                      {(msg.text || '').slice(0, 100)}{(msg.text || '').length > 100 ? '…' : ''}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* Resume button */}
                            <div style={{ padding:'10px 14px', borderTop:'1px solid var(--bdr)' }}>
                              <button
                                onClick={handleResume}
                                className="btn"
                                style={{ width:'100%', justifyContent:'center', fontSize:9, padding:'8px 12px', color:'var(--g)', borderColor:'var(--g)', letterSpacing:3 }}
                              >
                                ▶ RESUME SESSION
                              </button>
                            </div>
                          </>
                        ) : (
                          <div style={{ padding:'10px 14px', fontFamily:'var(--mono)', fontSize:9, color:'var(--dim)', letterSpacing:2 }}>
                            NO MESSAGES IN THIS SESSION
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Synced flash panel ── */}
          {fbSynced && (
            <div className="panel" style={{ padding:14, border:'1px solid var(--g)', background:'rgba(0,255,136,0.04)', animation:'fadeIn 0.2s ease' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--g)', letterSpacing:3, textAlign:'center' }}>
                ✓ SAVED LOCALLY (SQLITE)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
