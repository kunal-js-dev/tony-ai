import React, { useState, useEffect, useRef, useCallback, memo } from "react"
import { uploadDocument, listDocuments, deleteDocument, getDocumentDetail, getHealth, getPlatformStats } from "../utils/api"

const FILE_META = {
  pdf:   { icon: "📄", label: "PDF",   color: "#ff6b6b", bg: "rgba(255,107,107,0.08)" },
  excel: { icon: "📊", label: "EXCEL", color: "#69db7c", bg: "rgba(105,219,124,0.08)" },
  ppt:   { icon: "🎯", label: "PPT",   color: "#ffd43b", bg: "rgba(255,212,59,0.08)"  },
  doc:   { icon: "📝", label: "DOC",   color: "#74c0fc", bg: "rgba(116,192,252,0.08)" },
  ocr:   { icon: "🖼", label: "IMAGE", color: "#da77f2", bg: "rgba(218,119,242,0.08)" },
  txt:   { icon: "📃", label: "TXT",   color: "#94d82d", bg: "rgba(148,216,45,0.08)"  },
  csv:   { icon: "🗃", label: "CSV",   color: "#63e6be", bg: "rgba(99,230,190,0.08)"  },
}
const getFileMeta = (ft) => FILE_META[ft] || { icon: "📁", label: (ft||"FILE").toUpperCase(), color: "var(--c)", bg: "rgba(0,212,255,0.08)" }

const STATUS_CFG = {
  processed:        { color: "var(--g)",   border: "rgba(0,255,136,0.25)",  label: "✓ READY"      },
  processing:       { color: "var(--y)",   border: "rgba(255,214,10,0.25)", label: "⟳ PROCESSING" },
  embedding_failed: { color: "var(--r)",   border: "rgba(255,45,85,0.25)",  label: "✗ FAILED"     },
  empty:            { color: "var(--dim)", border: "rgba(0,212,255,0.12)",  label: "○ EMPTY"      },
  uploading:        { color: "var(--c)",   border: "rgba(0,212,255,0.3)",   label: "↑ UPLOADING"  },
}
const getStatus = (s) => STATUS_CFG[s] || STATUS_CFG.processing

function fmtBytes(b) {
  if (!b) return "0 B"
  const sizes = ["B","KB","MB","GB"]
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return `${(b/Math.pow(1024,i)).toFixed(1)} ${sizes[i]}`
}
function timeAgo(ts) {
  if (!ts) return "—"
  const d = (Date.now() - new Date(ts).getTime()) / 1000
  if (d < 60)    return "just now"
  if (d < 3600)  return `${Math.floor(d/60)}m ago`
  if (d < 86400) return `${Math.floor(d/3600)}h ago`
  return `${Math.floor(d/86400)}d ago`
}

/* ── Mini stat card ─────────────────────────────────────────────────────────── */
const MiniStat = memo(({ icon, label, value, color="var(--c)" }) => (
  <div className="panel" style={{ padding:"12px 14px", flex:1 }}>
    <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7 }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ fontFamily:"var(--mono)", fontSize:7, letterSpacing:2.5, color:"var(--dim)", textTransform:"uppercase" }}>{label}</span>
    </div>
    <div style={{ fontFamily:"var(--mono)", fontSize:20, fontWeight:700, color, textShadow:`0 0 12px ${color}55` }}>{value}</div>
  </div>
))

/* ── Upload zone ─────────────────────────────────────────────────────────────── */
function UploadZone({ onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [queue,    setQueue]    = useState([])
  const inputRef = useRef(null)
  const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp"

  const process = useCallback(async (files) => {
    for (const file of Array.from(files)) {
      const uid = `${file.name}-${Date.now()}`
      setQueue(p => [...p, { uid, name:file.name, progress:0, status:"uploading" }])
      try {
        const res = await uploadDocument(file, pct => {
          setQueue(p => p.map(u => u.uid === uid ? {...u, progress:pct} : u))
        })
        setQueue(p => p.map(u => u.uid === uid ? {...u, progress:100, status:"done"} : u))
        if (onUploaded) onUploaded(res)
      } catch (err) {
        setQueue(p => p.map(u => u.uid === uid ? {...u, status:"error", error:err.message} : u))
      }
    }
    setTimeout(() => setQueue(p => p.filter(u => u.status !== "done")), 4000)
  }, [onUploaded])

  const onDrop = e => { e.preventDefault(); setDragging(false); process(e.dataTransfer.files) }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border:`2px dashed ${dragging?"var(--c)":"rgba(0,212,255,0.18)"}`,
          borderRadius:8, padding:"24px 16px", textAlign:"center", cursor:"pointer",
          background:dragging?"rgba(0,212,255,0.05)":"rgba(0,212,255,0.01)",
          transition:"all 0.2s", boxShadow:dragging?"0 0 30px rgba(0,212,255,0.12)":"none",
        }}
      >
        <div style={{ fontSize:26, marginBottom:7 }}>🧬</div>
        <div style={{ fontFamily:"var(--mono)", fontSize:9.5, letterSpacing:2.5, color:"var(--c)", marginBottom:4 }}>DROP FILES TO INGEST</div>
        <div style={{ fontFamily:"var(--mono)", fontSize:7.5, color:"var(--dim)", letterSpacing:1 }}>PDF · DOCX · XLSX · CSV · PPTX · PNG · JPG</div>
        <input ref={inputRef} type="file" multiple accept={ACCEPT} style={{ display:"none" }} onChange={e => process(e.target.files)}/>
      </div>

      {queue.map(u => (
        <div key={u.uid} className="panel" style={{ padding:"7px 11px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: u.status==="uploading"?4:0 }}>
            <span style={{ fontFamily:"var(--mono)", fontSize:8.5, color:"var(--txt)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"72%" }}>
              {u.status==="done"?"✓ ":u.status==="error"?"✗ ":"↑ "}{u.name}
            </span>
            <span style={{ fontFamily:"var(--mono)", fontSize:8, color: u.status==="error"?"var(--r)":u.status==="done"?"var(--g)":"var(--c)" }}>
              {u.status==="error"?"FAILED":u.status==="done"?"INGESTED":`${u.progress}%`}
            </span>
          </div>
          {u.status==="uploading" && <div className="pbar"><div className="pbar-fill" style={{ width:`${u.progress}%` }}/></div>}
          {u.status==="error" && <div style={{ fontFamily:"var(--mono)", fontSize:7.5, color:"var(--r)", marginTop:2 }}>{u.error}</div>}
        </div>
      ))}
    </div>
  )
}

/* ── File row ────────────────────────────────────────────────────────────────── */
const FileRow = memo(({ file, isSelected, onDelete, onChat, onSelect }) => {
  const meta = getFileMeta(file.file_type)
  const st   = getStatus(file.status)
  return (
    <div
      onClick={() => onSelect(file)}
      style={{
        display:"flex", alignItems:"center", gap:9,
        padding:"8px 12px", borderBottom:"1px solid rgba(0,212,255,0.05)",
        cursor:"pointer",
        background:isSelected?"rgba(0,212,255,0.06)":"transparent",
        transition:"background 0.15s",
      }}
      onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background="rgba(0,212,255,0.03)" }}
      onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background="transparent" }}
    >
      <div style={{ width:30, height:30, borderRadius:5, background:meta.bg, border:`1px solid ${meta.color}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0 }}>{meta.icon}</div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:"var(--mono)", fontSize:9.5, color:"var(--txt)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {file.original_name||file.filename}
        </div>
        <div style={{ fontFamily:"var(--mono)", fontSize:7.5, color:"var(--dim)", marginTop:2 }}>
          {fmtBytes(file.filesize)} {file.word_count?`· ${file.word_count.toLocaleString()} words`:""} {file.page_count?`· ${file.page_count}p`:""} · {timeAgo(file.created_at)}
        </div>
      </div>

      <div style={{ fontFamily:"var(--mono)", fontSize:7.5, letterSpacing:1.5, color:st.color, border:`1px solid ${st.border}`, padding:"2px 6px", borderRadius:3, flexShrink:0 }}>{st.label}</div>
      {file.chunk_count>0 && <div style={{ fontFamily:"var(--mono)", fontSize:7.5, color:"var(--dim)", flexShrink:0 }}>{file.chunk_count}c</div>}

      <div style={{ display:"flex", gap:4, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
        <button className="btn" style={{ padding:"3px 7px", fontSize:8 }} onClick={()=>onChat(file)} title="Chat">💬</button>
        <button className="btn danger" style={{ padding:"3px 7px", fontSize:8 }} onClick={()=>onDelete(file.id)} title="Delete">🗑</button>
      </div>
    </div>
  )
})

/* ── Detail panel ────────────────────────────────────────────────────────────── */
function DetailPanel({ file, onClose, onChat }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const meta = getFileMeta(file?.file_type)

  useEffect(() => {
    if (!file) return
    setLoading(true); setDetail(null)
    getDocumentDetail(file.id).then(setDetail).catch(()=>setDetail(null)).finally(()=>setLoading(false))
  }, [file?.id])

  if (!file) return null

  return (
    <div className="panel" style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
      <div style={{ padding:"11px 13px", borderBottom:"1px solid var(--bdr)", display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
        <span style={{ fontSize:18 }}>{meta.icon}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"var(--mono)", fontSize:9.5, color:"var(--c)", letterSpacing:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {file.original_name||file.filename}
          </div>
          <div style={{ fontFamily:"var(--mono)", fontSize:7.5, color:"var(--dim)", marginTop:2 }}>
            {meta.label} · {fmtBytes(file.filesize)}
          </div>
        </div>
        <button className="btn" style={{ padding:"3px 7px", fontSize:9 }} onClick={onClose}>✕</button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:13 }}>
        {loading ? (
          <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--dim)", textAlign:"center", paddingTop:40 }}>
            <div style={{ animation:"spin 1s linear infinite", display:"inline-block", marginBottom:8, fontSize:18 }}>⟳</div>
            <div>LOADING ANALYSIS...</div>
          </div>
        ) : (
          <>
            <div className="section-label">DOCUMENT STATS</div>
            {[
              ["STATUS",  getStatus(file.status).label],
              ["WORDS",   (file.word_count||0).toLocaleString()],
              ["PAGES",   file.page_count||"—"],
              ["CHUNKS",  file.chunk_count||0],
              ["INDEXED", timeAgo(file.created_at)],
            ].map(([k,v]) => (
              <div className="irow" key={k}><span className="ik">{k}</span><span className="iv">{v}</span></div>
            ))}

            {detail?.content_preview && (
              <>
                <div className="divider" style={{ margin:"10px 0" }}/>
                <div className="section-label">CONTENT PREVIEW</div>
                <div style={{ fontFamily:"var(--mono)", fontSize:8.5, color:"rgba(192,224,255,0.6)", lineHeight:1.8, maxHeight:180, overflowY:"auto", background:"rgba(0,212,255,0.02)", border:"1px solid rgba(0,212,255,0.07)", padding:"7px 9px", borderRadius:4 }}>
                  {detail.content_preview}
                </div>
              </>
            )}

            {detail?.chunks?.length>0 && (
              <>
                <div className="divider" style={{ margin:"10px 0" }}/>
                <div className="section-label">VECTOR CHUNKS ({detail.chunks.length})</div>
                {detail.chunks.slice(0,3).map((c,i) => (
                  <div key={i} style={{ fontFamily:"var(--mono)", fontSize:7.5, color:"var(--dim)", background:"rgba(0,212,255,0.02)", border:"1px solid rgba(0,212,255,0.06)", padding:"5px 7px", borderRadius:3, marginBottom:4 }}>
                    <div style={{ color:"rgba(0,212,255,0.35)", marginBottom:2 }}>CHUNK {c.chunk_index??i}</div>
                    {c.preview}…
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      <div style={{ padding:11, borderTop:"1px solid var(--bdr)", flexShrink:0 }}>
        <button className="btn primary" style={{ width:"100%", justifyContent:"center", padding:"8px", fontSize:8.5, letterSpacing:2 }} onClick={()=>onChat(file)}>
          💬 CHAT WITH THIS DOCUMENT
        </button>
      </div>
    </div>
  )
}

/* ── Health strip ────────────────────────────────────────────────────────────── */
function HealthStrip({ health }) {
  if (!health) return null
  const items = [
    { label:"BACKEND",  ok:!!health.database_ok,     val:health.database_ok?"ONLINE":"OFFLINE" },
    { label:"OLLAMA",   ok:!!health.ollama_available, val:health.ollama_available?(health.ollama_models?.[0]||"READY").toUpperCase():"OFFLINE" },
    { label:"VECTORS",  ok:health.chromadb_chunks!=null, val:`${health.chromadb_chunks??0}` },
    { label:"UPTIME",   ok:true, val:health.uptime_seconds!=null?`${Math.floor(health.uptime_seconds/60)}m`:"—" },
  ]
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {items.map(it => (
        <div key={it.label} style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 9px", border:"1px solid var(--bdr)", fontFamily:"var(--mono)", fontSize:7.5, letterSpacing:1.5, background:"rgba(0,212,255,0.02)" }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:it.ok?"var(--g)":"var(--r)", boxShadow:`0 0 6px ${it.ok?"var(--g)":"var(--r)"}` }}/>
          <span style={{ color:"var(--dim)" }}>{it.label}</span>
          <span style={{ color:it.ok?"var(--c)":"var(--r)" }}>{it.val}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────────── */
export default function DocumentsDashboard({ onChatWithDoc }) {
  const [files,    setFiles]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [health,   setHealth]   = useState(null)
  const [stats,    setStats]    = useState(null)
  const [selected, setSelected] = useState(null)
  const [filter,   setFilter]   = useState("all")
  const [search,   setSearch]   = useState("")
  const pollRef = useRef(null)

  const loadAll = useCallback(async () => {
    const [fRes, hRes, sRes] = await Promise.allSettled([listDocuments(), getHealth(), getPlatformStats()])
    if (fRes.status==="fulfilled") setFiles(fRes.value?.files||[])
    if (hRes.status==="fulfilled") setHealth(hRes.value)
    if (sRes.status==="fulfilled") setStats(sRes.value)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAll()
    pollRef.current = setInterval(loadAll, 5000)
    return () => clearInterval(pollRef.current)
  }, [loadAll])

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id)
      setFiles(p => p.filter(f => f.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch {}
  }

  const handleChat = (file) => { if (onChatWithDoc) onChatWithDoc(file) }

  const fileTypes = [...new Set(files.map(f=>f.file_type).filter(Boolean))]
  const filtered  = files.filter(f => {
    if (filter!=="all" && f.file_type!==filter) return false
    if (search) return (f.original_name||f.filename||"").toLowerCase().includes(search.toLowerCase())
    return true
  })

  return (
    <div style={{ display:"flex", height:"100vh", flexDirection:"column", animation:"pageIn .3s ease", padding:5, gap:5 }}>

      {/* Header */}
      <div className="panel" style={{ flexShrink:0, border:"none", borderBottom:"1px solid var(--bdr)", background:"rgba(0,5,15,0.92)", padding:"0 18px", display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontFamily:"var(--mono)", fontWeight:700, fontSize:20, color:"var(--c)", letterSpacing:5, textShadow:"0 0 16px rgba(0,212,255,0.6)" }}>DOCUMENT VAULT</div>
          <HealthStrip health={health}/>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontFamily:"var(--mono)", fontSize:7.5, color:"var(--dim)" }}>{files.length} FILE{files.length!==1?"S":""} INDEXED</span>
          <button className="btn" style={{ padding:"5px 10px", fontSize:8 }} onClick={loadAll}>⟳ REFRESH</button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"270px 1fr 290px", gap:5, overflow:"hidden", minHeight:0 }}>

        {/* Left: upload + stats + filter */}
        <div style={{ display:"flex", flexDirection:"column", gap:5, overflowY:"auto" }}>
          <div className="panel" style={{ padding:14, flexShrink:0 }}>
            <div className="ck tl"/><div className="ck tr"/>
            <div className="section-label">INGEST DOCUMENTS</div>
            <UploadZone onUploaded={() => { loadAll(); setTimeout(loadAll, 2000) }}/>
          </div>

          <div className="panel" style={{ padding:14, flexShrink:0 }}>
            <div className="section-label">PLATFORM STATS</div>
            <div style={{ display:"flex", gap:5, marginBottom:5 }}>
              <MiniStat icon="📄" label="Files"    value={stats?.total_files??files.length} color="var(--c)"/>
              <MiniStat icon="🧩" label="Chunks"   value={stats?.total_chunks??"—"}        color="#da77f2"/>
            </div>
            <div style={{ display:"flex", gap:5 }}>
              <MiniStat icon="💬" label="Sessions" value={stats?.total_sessions??"—"}      color="var(--g)"/>
              <MiniStat icon="💾" label="Storage"  value={fmtBytes(stats?.storage_bytes??0)} color="var(--y)"/>
            </div>
          </div>

          {fileTypes.length>0 && (
            <div className="panel" style={{ padding:14, flexShrink:0 }}>
              <div className="section-label">FILTER BY TYPE</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                <button className={`btn ${filter==="all"?"active":""}`} style={{ padding:"4px 9px", fontSize:8 }} onClick={()=>setFilter("all")}>ALL</button>
                {fileTypes.map(ft => {
                  const m = getFileMeta(ft)
                  return <button key={ft} className={`btn ${filter===ft?"active":""}`} style={{ padding:"4px 9px", fontSize:8 }} onClick={()=>setFilter(ft)}>{m.icon} {m.label}</button>
                })}
              </div>
            </div>
          )}
        </div>

        {/* Centre: file list */}
        <div className="panel" style={{ display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
          <div style={{ padding:"9px 12px", borderBottom:"1px solid var(--bdr)", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <span style={{ fontFamily:"var(--mono)", fontSize:12, color:"var(--dim)" }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents..."
              style={{ flex:1, background:"transparent", border:"none", outline:"none", fontFamily:"var(--mono)", fontSize:9.5, color:"var(--txt)", caretColor:"var(--c)" }}/>
            {search && <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", color:"var(--dim)", cursor:"pointer", fontSize:12 }}>✕</button>}
            <span style={{ fontFamily:"var(--mono)", fontSize:7.5, color:"var(--dim)" }}>{filtered.length}/{files.length}</span>
          </div>

          <div style={{ flex:1, overflowY:"auto" }}>
            {loading ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:12 }}>
                <div style={{ fontFamily:"var(--mono)", fontSize:26, animation:"spin 1.2s linear infinite" }}>⟳</div>
                <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--dim)", letterSpacing:3 }}>LOADING VAULT...</div>
              </div>
            ) : filtered.length===0 ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:10 }}>
                <div style={{ fontSize:38, opacity:0.25 }}>📭</div>
                <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--dim)", letterSpacing:2 }}>{search?"NO MATCHES FOUND":"NO DOCUMENTS INDEXED"}</div>
                {!search && <div style={{ fontFamily:"var(--mono)", fontSize:8, color:"rgba(0,212,255,0.22)" }}>Drop files on the left to begin</div>}
              </div>
            ) : (
              filtered.map(f => (
                <FileRow key={f.id} file={f} isSelected={selected?.id===f.id}
                  onDelete={handleDelete} onChat={handleChat}
                  onSelect={f => setSelected(p => p?.id===f.id?null:f)}/>
              ))
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div style={{ overflow:"hidden" }}>
          {selected ? (
            <DetailPanel file={selected} onClose={()=>setSelected(null)} onChat={handleChat}/>
          ) : (
            <div className="panel" style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
              <div style={{ fontSize:38, opacity:0.18 }}>🔍</div>
              <div style={{ fontFamily:"var(--mono)", fontSize:8.5, color:"var(--dim)", letterSpacing:2, textAlign:"center" }}>SELECT A DOCUMENT<br/>TO VIEW DETAILS</div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
