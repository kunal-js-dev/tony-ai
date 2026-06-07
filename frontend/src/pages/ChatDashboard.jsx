import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import MessageBubble from '../components/MessageBubble'
import WaveVisualizer from '../components/WaveVisualizer'
import { sendChat } from '../utils/api'
import { uploadFile, analyzeDocument } from '../api/client'
import {
  saveMessage,
  saveSessionMeta,
  ensureDbReady,
  generateSessionId,
} from '../utils/chatStorage'

// ── useMemo: SUGGESTIONS never changes — memoized at module scope ────────────
const SUGGESTIONS = [
  "Explain machine learning in simple terms",
  "Write a Python function to sort a list",
  "What is quantum computing?",
  "Help me debug my React code",
  "Tell me a programming joke",
  "What are the best coding practices?",
  "Explain recursion with an example",
  "How does a neural network work?",
]

// ── React.memo: MessageBubble wrapper — avoids re-rendering all bubbles ──────
const MemoMessageBubble = memo(MessageBubble)

// ── React.memo: WaveVisualizer panel — only re-renders when isSpeaking changes
const VoiceOutputPanel = memo(function VoiceOutputPanel({ tts }) {
  return (
    <div className="panel" style={{ padding:14 }}>
      <div className="section-label">VOICE OUTPUT</div>
      <WaveVisualizer active={tts.isSpeaking}/>
      <div style={{ textAlign:'center', fontFamily:'var(--mono)', fontSize:9, letterSpacing:2, color: tts.isSpeaking?'var(--g)':'var(--dim)', marginTop:6 }}>
        {tts.isSpeaking ? '● SPEAKING...' : 'STANDBY'}
      </div>
      <div className="divider" style={{ margin:'10px 0' }}/>
      <div className="irow"><span className="ik">MODE</span><span className="iv">{tts.voiceLabel}</span></div>
      <div className="irow"><span className="ik">TTS</span><span className="iv" style={{ color: tts.ttsEnabled?'var(--g)':'var(--r)' }}>{tts.ttsEnabled?'ENABLED':'MUTED'}</span></div>
    </div>
  )
})

// ── Save-status toast ─────────────────────────────────────────────────────────
function SaveToast({ status }) {
  if (!status) return null
  const isOk = status === 'saved'
  return (
    <div style={{
      position: 'fixed', bottom: 80, right: 24, zIndex: 999,
      padding: '6px 14px',
      fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
      border: `1px solid ${isOk ? 'var(--g)' : 'var(--r)'}`,
      color:       isOk ? 'var(--g)' : 'var(--r)',
      background:  isOk ? 'rgba(0,255,136,0.06)' : 'rgba(255,50,50,0.06)',
      animation: 'fadeIn 0.2s ease',
    }}>
      {isOk ? '✓ SAVED TO SQLITE' : '✗ SAVE FAILED'}
    </div>
  )
}

export default function ChatDashboard({ ollamaStatus, tts, resumedSession, initialDocFile }) {
  const ts = () => new Date().toLocaleTimeString('en-US', { hour12:false })

  // ── Session ID lives in state so clearing chat creates a new one ──────────
  const [sessionId,    setSessionId]  = useState(() => {
    if (resumedSession?.sessionId) return resumedSession.sessionId
    return generateSessionId()
  })
  const sessionMetaSaved              = useRef(!!resumedSession?.sessionId)

  const [messages,  setMessages]  = useState(() => {
    if (resumedSession?.messages && resumedSession.messages.length > 0) return resumedSession.messages
    return [{ id:0, role:'ai', source:'system', timestamp: ts(),
      text: 'Neural interface initialized, Boss. Ask me anything.' }]
  })
  const [isTyping,  setIsTyping]  = useState(false)
  const [inputVal,  setInputVal]  = useState('')
  const [fbStatus,  setFbStatus]  = useState(null)   // 'saved' | 'error' | null
  const [dbOnline,  setDbOnline]  = useState(true)
  const [msgCount,  setMsgCount]  = useState(0)       // user messages this session
  const [attachedFiles, setAttachedFiles] = useState(() =>
    initialDocFile ? [{ id: initialDocFile.id, name: initialDocFile.original_name || initialDocFile.filename, type: initialDocFile.file_type }] : []
  )
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef              = useRef(null)
  const scrollRef                 = useRef(null)
  const msgId                     = useRef(resumedSession?.messages?.length ? Math.max(...resumedSession.messages.map(m => m.id || 0)) : 1)

  useEffect(() => {
    ensureDbReady().then(setDbOnline)
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isTyping])

  // ── Track user message count for session stats ──────────────────────────
  useEffect(() => {
    setMsgCount(messages.filter(m => m.role === 'user').length)
  }, [messages])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    
    const ext = file.name.split('.').pop().toLowerCase()
    let type = 'doc'
    if (ext === 'pdf') type = 'pdf'
    else if (['xls', 'xlsx', 'csv'].includes(ext)) type = 'excel'
    else if (['ppt', 'pptx'].includes(ext)) type = 'ppt'
    else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) type = 'ocr'

    try {
      const upRes = await uploadFile(file)
      if (upRes?.file?.id) {
        const fileId = upRes.file.id
        const fileName = file.name
        
        setAttachedFiles(prev => [...prev, { id: fileId, name: fileName, type }])
        
        // Make the file upload visible in the chat!
        const statusMsg = addMsg(`📎 Attached file: ${fileName}. Extracting and analyzing in background...`, 'system')

        // Run analysis in background to make UI feel instant
        analyzeDocument(type, { file_id: fileId }).then(() => {
          updateMsg(statusMsg.id, `✅ Analysis complete for: ${fileName}. It is now fully searchable.`)
        }).catch(err => {
          console.error('Background analysis failed', err)
          updateMsg(statusMsg.id, `❌ Analysis failed for: ${fileName}.`)
        })
      }
    } catch (err) {
      console.error('Upload failed', err)
      showSaveFeedback(false)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const showSaveFeedback = useCallback((success) => {
    setFbStatus(success ? 'saved' : 'error')
    setTimeout(() => setFbStatus(null), 1800)
  }, [])

  const updateMsg = useCallback((id, text) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text } : m))
  }, [])

  const addMsg = useCallback((text, role, source) => {
    const msg = { id: ++msgId.current, role, source, text, timestamp: ts() }
    setMessages(prev => [...prev, msg])
    return msg
  }, [])

  const handleSend = useCallback(async (text) => {
    if (!text.trim()) return
    setInputVal('')
    const userMsg = addMsg(text, 'user')
    setIsTyping(true)

    // Save session metadata once (on first user message)
    if (!sessionMetaSaved.current) {
      sessionMetaSaved.current = true
      saveSessionMeta(sessionId, text)
    }

    // Persist user message
    saveMessage(sessionId, userMsg)
      .then(saved => showSaveFeedback(saved?.success))
      .catch(() => showSaveFeedback(false))

    try {
      // Send numeric file IDs so FastAPI RAG engine fetches relevant chunks
      const fileIds = attachedFiles.length > 0 ? attachedFiles.map(f => Number(f.id)).filter(Boolean) : null
      const d = await sendChat(text, sessionId, fileIds)
      const aiMsg = addMsg(d.response || '[ No response ]', 'ai', d.source)
      if (tts.ttsEnabled) tts.speak(d.response || '')
      saveMessage(sessionId, aiMsg)
    } catch (e) {
      addMsg('Server unreachable. Make sure the backend is running on port 8000 or 5000.', 'ai', 'fallback')
    } finally { setIsTyping(false) }
  }, [addMsg, tts, sessionId, showSaveFeedback, attachedFiles])

  // ── Clear chat: start a brand-new session ────────────────────────────────
  const clearChat = useCallback(() => {
    const newId = generateSessionId()
    setSessionId(newId)
    sessionMetaSaved.current = false
    msgId.current = 1
    setMessages([{
      id: 1, role:'ai', source:'action', timestamp:ts(),
      text:'Chat cleared. Ready for new session, Boss.',
    }])
  }, [])

  const suggestionsList = useMemo(() => SUGGESTIONS, [])

  return (
    <div style={{ display:'flex', height:'100vh', flexDirection:'column', animation:'pageIn .3s ease', padding:5, gap:5 }}>

      {/* Header */}
      <div className="panel" style={{ flexShrink:0, border:'none', borderBottom:'1px solid var(--bdr)', background:'rgba(0,5,15,0.92)', padding:'0 18px', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:20, color:'var(--c)', letterSpacing:5, textShadow:'0 0 16px rgba(0,212,255,0.6)' }}>NEURAL INTERFACE</div>
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', border:'1px solid var(--bdr)', background:'rgba(0,212,255,0.03)' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background: ollamaStatus.online?'var(--g)':'var(--r)', animation:'blink 2s infinite' }}/>
            <span style={{ fontFamily:'var(--mono)', fontSize:8.5, color: ollamaStatus.online?'var(--g)':'#ff7070', letterSpacing:1.5 }}>
              {ollamaStatus.online ? (ollamaStatus.models[0]||'READY').toUpperCase() : 'FALLBACK MODE'}
            </span>
          </div>
          {/* Local SQLite storage indicator — no cloud */}
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', border:'1px solid var(--bdr)' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background: dbOnline ? 'var(--g)' : 'var(--y)' }}/>
            <span style={{ fontFamily:'var(--mono)', fontSize:7.5, letterSpacing:1.5, color: dbOnline ? 'var(--g)' : 'var(--y)' }}>
              {dbOnline ? '● LOCAL SQLITE' : '● BROWSER ONLY'}
            </span>
          </div>
          {/* Resumed session indicator */}
          {resumedSession?.messages && resumedSession.messages.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', border:'1px solid var(--bdr)', background:'rgba(0,255,136,0.04)' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--g)' }}/>
              <span style={{ fontFamily:'var(--mono)', fontSize:7.5, letterSpacing:1.5, color:'var(--g)' }}>
                RESUMED SESSION
              </span>
            </div>
          )}
          {/* Pre-loaded doc context indicator */}
          {initialDocFile && (
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', border:'1px solid rgba(218,119,242,0.3)', background:'rgba(218,119,242,0.05)', maxWidth:200, overflow:'hidden' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#da77f2', boxShadow:'0 0 6px #da77f2' }}/>
              <span style={{ fontFamily:'var(--mono)', fontSize:7.5, letterSpacing:1.5, color:'#da77f2', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                📎 {initialDocFile.original_name || initialDocFile.filename}
              </span>
            </div>
          )}

        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn active" onClick={tts.toggle}>{tts.ttsEnabled?'🔊':'🔇'} TTS</button>
          <button className="btn" onClick={tts.cycleVoice}>🗣️ {tts.voiceLabel}</button>
          <button className="btn danger" onClick={clearChat}>🗑️ NEW CHAT</button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 280px', gap:5, overflow:'hidden' }}>

        {/* Chat */}
        <div className="panel" style={{ display:'flex', flexDirection:'column', padding:0 }}>
          <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>

          <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'16px 18px', display:'flex', flexDirection:'column', gap:12 }}>
            {messages.map(m => <MemoMessageBubble key={m.id} {...m}/>)}
            {isTyping && (
              <div className="msg ai">
                <div className="msg-av">AI</div>
                <div className="msg-bw"><div className="msg-bub typing"><span/><span/><span/></div></div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ borderTop:'1px solid var(--bdr)', padding:'10px 16px', background:'rgba(0,5,15,0.6)' }}>
            
            {/* Attached Files Pills */}
            {attachedFiles.length > 0 && (
              <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                {attachedFiles.map(f => (
                  <div key={f.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:4, fontFamily:'var(--mono)', fontSize:10, color:'var(--c)' }}>
                    <span>📎 {f.name}</span>
                    <button onClick={() => setAttachedFiles(p => p.filter(x => x.id !== f.id))} style={{ background:'none', border:'none', color:'var(--r)', cursor:'pointer', padding:0, fontSize:12 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {isUploading && (
              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--y)', marginBottom:8 }}>
                ● Uploading and analyzing...
              </div>
            )}

            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display:'none' }} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading}
                style={{ width: 40, height: 40, flexShrink: 0, background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.3)', color:'var(--c)', fontSize: 20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: isUploading ? 0.5 : 1 }}>
                +
              </button>
              <input value={inputVal} onChange={e=>setInputVal(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend(inputVal)}}}
                placeholder="Ask TONY anything..."
                style={{ flex:1, height: 40, background:'var(--input-bg)', border:'1px solid var(--input-border)', outline:'none', fontFamily:'var(--mono)', fontSize:13, color:'var(--txt)', caretColor:'var(--c)', padding:'0 14px', boxSizing:'border-box' }}/>
              <button onClick={()=>handleSend(inputVal)} style={{ height: 40, background:'linear-gradient(90deg,var(--c2),var(--c))', border:'none', color:'#000d18', fontFamily:'var(--mono)', fontSize:10, fontWeight:700, letterSpacing:3, padding:'0 22px', cursor:'pointer', textTransform:'uppercase', boxSizing:'border-box' }}>
                SEND
              </button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>

          {/* TTS status — memoized panel */}
          <VoiceOutputPanel tts={tts}/>

          {/* Session stats */}
          <div className="panel" style={{ padding:14 }}>
            <div className="section-label">SESSION</div>
            <div className="irow"><span className="ik">MESSAGES</span><span className="iv">{messages.length}</span></div>
            <div className="irow"><span className="ik">USER MSGS</span><span className="iv">{msgCount}</span></div>
            <div className="irow"><span className="ik">ENGINE</span><span className="iv" style={{ color: ollamaStatus.online?'var(--g)':'var(--y)' }}>{ollamaStatus.online?'OLLAMA':'FALLBACK'}</span></div>
            <div className="irow">
              <span className="ik">STORAGE</span>
              <span className="iv" style={{ color: dbOnline ? 'var(--g)' : 'var(--y)' }}>
                {dbOnline ? 'SQLITE' : 'BROWSER'}
              </span>
            </div>
            <div className="irow"><span className="ik">SESSION ID</span><span className="iv" style={{ fontSize:7, letterSpacing:0 }}>{sessionId.slice(-8)}</span></div>
          </div>

          {/* Suggestions */}
          <div className="panel" style={{ padding:14, flex:1, overflowY:'auto' }}>
            <div className="section-label">SUGGESTIONS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {suggestionsList.map((s,i) => (
                <button key={i} className="btn" style={{ fontSize:8.5, padding:'6px 10px', textAlign:'left', justifyContent:'flex-start', whiteSpace:'normal', lineHeight:1.5 }}
                  onClick={()=>handleSend(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save status toast */}
      <SaveToast status={fbStatus}/>
    </div>
  )
}
