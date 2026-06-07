import React, { useState, useRef, useEffect, useCallback } from 'react'
import ArcGauge      from '../components/ArcGauge'
import ArcReactor    from '../components/ArcReactor'
import WaveVisualizer from '../components/WaveVisualizer'
import MessageBubble  from '../components/MessageBubble'
import { useVoiceInput } from '../hooks/useVoiceInput'
import { sendChat, launchApp, doSystemAction } from '../utils/api'
import { saveMessage, saveSessionMeta } from '../utils/chatStorage'

const QUICK_CMDS = [
  {l:'CPU',  c:'CPU status'},{l:'RAM',c:'RAM status'},
  {l:'BAT',  c:'Battery status'},{l:'TIME',c:'What time is it?'},
  {l:'DISK', c:'Disk storage'},{l:'SYS',c:'OS info'},
  {l:'JOKE', c:'Tell me a joke'},{l:'HELP',c:'What can you do?'},
]
const APPS = [
  {icon:'📝',name:'NOTEPAD',app:'notepad'},{icon:'🔢',name:'CALC',app:'calculator'},
  {icon:'📁',name:'FILES',app:'explorer'},{icon:'⬛',name:'CMD',app:'cmd'},
  {icon:'💻',name:'VSCODE',app:'vscode'},{icon:'🔷',name:'PS',app:'powershell'},
]
const ACTIONS = [
  {icon:'📸',name:'SNIP',action:'screenshot',d:false},
  {icon:'🔒',name:'LOCK',action:'lock',d:false},
  {icon:'🔊',name:'VOL+',action:'volume_up',d:false},
  {icon:'🔇',name:'MUTE',action:'mute',d:false},
  {icon:'😴',name:'SLEEP',action:'sleep',d:true},
  {icon:'⏻',name:'SHUT',action:'shutdown',d:true},
]

export default function HUDDashboard({ stats, ollamaStatus, tts }) {
  const sessionIdRef = useRef('session_hud_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7))
  const SESSION_ID = sessionIdRef.current

  const sessionInitialized = useRef(false)
  const ensureSessionMeta = async (firstText = 'HUD Session Started') => {
    if (sessionInitialized.current) return
    sessionInitialized.current = true
    try {
      await saveSessionMeta(SESSION_ID, firstText, 'HUD Session')
    } catch (e) {
      console.error('[HUD] saveSessionMeta failed:', e)
    }
  }

  const [messages,   setMessages]   = useState([])
  const [isTyping,   setIsTyping]   = useState(false)
  const [inputVal,   setInputVal]   = useState('')
  const [inputFocus, setInputFocus] = useState(false)
  const scrollRef = useRef(null)
  const msgId     = useRef(0)

  const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false })

  // Welcome message on mount
  useEffect(() => {
    setTimeout(() => {
      setMessages([{
        id: 0, role: 'ai', source: 'fallback', timestamp: ts(),
        text: "All systems online, Boss. TONY AI is ready.\n\n• Ask anything — coding, math, analysis\n• Use quick-access buttons on the right\n• Voice input ready — click 🎤"
      }])
    }, 400)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isTyping])

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

    await ensureSessionMeta(text)
    await saveMessage(SESSION_ID, { ...userMsg, sessionId: SESSION_ID })

    try {
      const d = await sendChat(text)
      const aiMsg = addMsg(d.response || '[ No response ]', 'ai', d.source)
      if (tts.ttsEnabled) tts.speak(d.response || '')
      await saveMessage(SESSION_ID, { ...aiMsg, sessionId: SESSION_ID })
    } catch {
      const failMsg = addMsg('Cannot reach TONY server. Make sure the backend is running on port 8000 or 5000.', 'ai', 'fallback')
      await saveMessage(SESSION_ID, { ...failMsg, sessionId: SESSION_ID })
    } finally {
      setIsTyping(false)
    }
  }, [addMsg, tts, SESSION_ID])

  // ── useVoiceInput hook — replaces previous inline voice code ────────────────
  const onFinalVoice = useCallback((txt) => {
    setInputVal(txt)
    handleSend(txt)
  }, [handleSend])

  const {
    voiceState, statusMsg, interimText, isListening, toggleListen, supported: voiceSupported
  } = useVoiceInput(onFinalVoice)

  // Keep input box in sync with interim speech text while listening
  useEffect(() => {
    if (interimText) setInputVal(interimText)
  }, [interimText])

  // ── App launcher & system actions ───────────────────────────────────────────
  const handleLaunch = async (app) => {
    try {
      await ensureSessionMeta(`Launch app: ${app}`)
      const d = await launchApp(app)
      const actionMsg = addMsg(d.response || `Launched ${app}.`, 'ai', 'action')
      await saveMessage(SESSION_ID, { ...actionMsg, sessionId: SESSION_ID })
    } catch { /* silent */ }
  }
  const handleAction = async (action) => {
    try {
      await ensureSessionMeta(`System action: ${action}`)
      const d = await doSystemAction(action)
      const actionMsg = addMsg(d.response || `Done: ${action}`, 'ai', 'action')
      await saveMessage(SESSION_ID, { ...actionMsg, sessionId: SESSION_ID })
    } catch { /* silent */ }
  }

  const s = stats

  return (
    <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 240px', gridTemplateRows:'64px 1fr 112px', height:'100vh', gap:5, padding:5, animation:'pageIn .3s ease' }}>

      {/* ── HEADER ── */}
      <div className="panel" style={{ gridColumn:'1/-1', border:'none', borderBottom:'1px solid var(--bdr)', background:'rgba(0,5,15,0.92)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <ArcReactor size={32}/>
          <div>
            <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:22, letterSpacing:6, color:'var(--c)', textShadow:'0 0 20px rgba(0,212,255,0.65)' }}>TONY AI</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:7.5, letterSpacing:2.5, color:'var(--dim)' }}>TACTICAL OFFLINE NEURAL YIELDING ASSISTANT</div>
          </div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', border:`1px solid ${ollamaStatus.online?'rgba(0,255,136,0.3)':'rgba(255,45,85,0.3)'}`, background: ollamaStatus.online?'rgba(0,255,136,0.04)':'rgba(255,45,85,0.04)', fontFamily:'var(--mono)', fontSize:9.5, letterSpacing:1.5, color: ollamaStatus.online?'var(--g)':'#ff7070' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'currentColor', animation:'blink 2s infinite' }}/>
            {ollamaStatus.online ? `OLLAMA ONLINE · ${(ollamaStatus.models[0]||'').toUpperCase()}` : 'OLLAMA OFFLINE — FALLBACK MODE'}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:22, letterSpacing:4, color:'var(--c)', textShadow:'0 0 12px rgba(0,212,255,0.55)' }}>
            {new Date().toLocaleTimeString('en-US',{hour12:false})}
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:8.5, letterSpacing:2, color:'var(--dim)', marginTop:2 }}>
            {new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'}).toUpperCase()}
          </div>
        </div>
      </div>

      {/* ── LEFT: SYSTEM DIAGNOSTICS ── */}
      <div className="panel" style={{ display:'flex', flexDirection:'column', gap:9, padding:13, overflow:'hidden' }}>
        <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
        <div className="section-label">SYSTEM DIAGNOSTICS</div>

        {[
          { l:'CPU LOAD', v:`${s?.cpu_percent?.toFixed(1)||'--'}%`,  sub: s?.cpu_cores?`${s.cpu_cores} cores / ${s.cpu_threads} threads`:'--', pct:s?.cpu_percent },
          { l:'MEMORY',   v:`${s?.ram_used_gb||'--'} GB`, sub:`of ${s?.ram_total_gb||'--'} GB`, pct:s?.ram_percent },
          { l:'STORAGE',  v:`${s?.disk_used_gb||'--'} GB`, sub:`of ${s?.disk_total_gb||'--'} GB`, pct:s?.disk_percent },
        ].map(m => (
          <div key={m.l}>
            <div className="metric-label">{m.l}</div>
            <div className="metric-val">{m.v}</div>
            <div className="metric-sub">{m.sub}</div>
            <div className="pbar" style={{ marginTop:5 }}>
              <div className={`pbar-fill${(m.pct||0)>=85?' hot':''}`} style={{ width:`${m.pct||0}%` }}/>
            </div>
          </div>
        ))}

        {/* Battery */}
        <div>
          <div className="metric-label">BATTERY</div>
          <div className="metric-val">{s?.battery_percent!=null?`${s.battery_percent}%`:'N/A'}</div>
          <div className="metric-sub">{s?.battery_plugged?'⚡ CHARGING':s?.battery_percent!=null?'🔋 ON BATTERY':'DESKTOP'}</div>
          <div className="pbar" style={{ marginTop:5 }}>
            <div className={`pbar-fill${(s?.battery_percent||0)<=20?' hot':' good'}`} style={{ width:`${s?.battery_percent||0}%` }}/>
          </div>
        </div>

        <div className="divider"/>
        <div className="irow"><span className="ik">OS</span><span className="iv">{s?.os?.split(' ').slice(0,2).join(' ')||'--'}</span></div>
        <div className="irow"><span className="ik">HOST</span><span className="iv">{(s?.hostname||'--').substring(0,12)}</span></div>
        <div className="irow"><span className="ik">UPTIME</span><span className="iv">{s?.uptime_hours||'--'} h</span></div>
        <div className="irow"><span className="ik">NET ↓</span><span className="iv">{s?.net_down_kb||0} KB/s</span></div>
        <div className="irow"><span className="ik">NET ↑</span><span className="iv">{s?.net_up_kb||0} KB/s</span></div>
        <div className="irow"><span className="ik">FREQ</span><span className="iv">{s?.cpu_freq_current||'--'} MHz</span></div>
      </div>

      {/* ── CENTER: CHAT ── */}
      <div className="panel" style={{ display:'flex', flexDirection:'column', padding:0 }}>
        <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>

        {/* chat header */}
        <div style={{ padding:'9px 14px 8px', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(0,5,15,0.5)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="section-label" style={{ margin:0 }}>NEURAL INTERFACE</div>
            <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'rgba(0,212,255,0.25)' }}>{messages.length} MSGS</span>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            <button className="btn active" onClick={tts.toggle}>{tts.ttsEnabled?'🔊 TTS':'🔇 TTS'}</button>
            <button className="btn" onClick={tts.cycleVoice}>🗣️ {tts.voiceLabel}</button>
          </div>
        </div>

        {/* messages */}
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:10 }}>
          {messages.map(m => <MessageBubble key={m.id} {...m}/>)}
          {isTyping && (
            <div className="msg ai">
              <div className="msg-av">AI</div>
              <div className="msg-bw"><div className="msg-bub typing"><span/><span/><span/></div></div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: ARC CORE ── */}
      <div className="panel" style={{ display:'flex', flexDirection:'column', gap:9, padding:13, overflowY:'auto' }}>
        <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
        <div className="section-label">ARC CORE</div>

        <div style={{ display:'flex', justifyContent:'center' }}>
          <ArcGauge value={s?.cpu_percent||0} label="CPU LOAD" isSpeaking={tts.isSpeaking}/>
        </div>

        <WaveVisualizer active={tts.isSpeaking}/>
        <div style={{ textAlign:'center', fontFamily:'var(--mono)', fontSize:8.5, letterSpacing:2, color: tts.isSpeaking?'var(--g)':'var(--dim)' }}>
          {tts.isSpeaking ? '● SPEAKING...' : 'TTS STANDBY'}
        </div>

        <div className="divider"/>
        <div className="irow"><span className="ik">THREADS</span><span className="iv">{s?.cpu_threads||'--'}</span></div>
        <div className="irow"><span className="ik">RAM FREE</span><span className="iv">{s?((s.ram_total_gb-s.ram_used_gb).toFixed(1)):'--'} GB</span></div>
        <div className="irow"><span className="ik">DISK FREE</span><span className="iv">{s?((s.disk_total_gb-s.disk_used_gb).toFixed(1)):'--'} GB</span></div>

        <div className="divider"/>
        <div className="section-label">QUICK ACCESS</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {QUICK_CMDS.map(q => (
            <button key={q.l} className="btn" style={{ fontSize:8, padding:'4px 7px' }}
              onClick={() => handleSend(q.c)}>{q.l}</button>
          ))}
        </div>

        <div className="divider"/>
        <div className="section-label">APP LAUNCHER</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3 }}>
          {APPS.map(a => (
            <button key={a.app} className="btn" style={{ fontSize:8, padding:'5px 6px', gap:4 }}
              onClick={() => handleLaunch(a.app)}>
              <span>{a.icon}</span><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name}</span>
            </button>
          ))}
        </div>

        <div className="divider"/>
        <div className="section-label">SYS ACTIONS</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3 }}>
          {ACTIONS.map(a => (
            <button key={a.action} className={`btn${a.d?' danger':''}`} style={{ fontSize:8, padding:'5px 6px', gap:4 }}
              onClick={() => handleAction(a.action)}>
              <span>{a.icon}</span><span>{a.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── FOOTER: INPUT BAR ── */}
      <div style={{ gridColumn:'1/-1', borderTop:'1px solid var(--bdr)', background:'rgba(0,5,15,0.92)', padding:'9px 18px 11px', display:'flex', flexDirection:'column', gap:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:14, color:'var(--c)', textShadow:'0 0 10px rgba(0,212,255,0.5)', whiteSpace:'nowrap' }}>TONY://&gt;</span>
          <div style={{ flex:1, border:`1px solid ${inputFocus?'rgba(0,212,255,0.4)':'rgba(0,212,255,0.14)'}`, background:'rgba(0,212,255,0.02)', display:'flex', alignItems:'center', padding:'0 12px', transition:'border-color .2s', boxShadow: inputFocus?'0 0 18px rgba(0,212,255,0.06)':'none' }}>
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend(inputVal) } }}
              onFocus={() => setInputFocus(true)}
              onBlur={() => setInputFocus(false)}
              placeholder="Enter command or ask anything, Boss..."
              style={{ flex:1, background:'transparent', border:'none', outline:'none', fontFamily:'var(--mono)', fontSize:13, color:'#d8f0ff', caretColor:'var(--c)', padding:'8px 0' }}
            />
          </div>
          {/* Mic button — disabled state if browser has no SR support */}
          <button
            onClick={toggleListen}
            disabled={!voiceSupported}
            title={!voiceSupported ? 'Speech recognition not supported in this browser' : isListening ? 'Stop listening' : 'Start voice input'}
            style={{ background:'transparent', border:`1px solid ${isListening?'rgba(255,45,85,0.5)':'rgba(0,212,255,0.22)'}`, color: isListening?'var(--r)':'rgba(0,212,255,0.5)', padding:'8px 12px', cursor: voiceSupported?'pointer':'not-allowed', fontSize:14, borderRadius:2, animation: isListening?'micpulse 1s infinite':'', opacity: voiceSupported?1:0.4 }}>
            🎤
          </button>
          <button
            onClick={() => handleSend(inputVal)}
            style={{ background:'transparent', border:'1px solid var(--c)', color:'var(--c)', fontFamily:'var(--mono)', fontSize:10, fontWeight:700, letterSpacing:3, padding:'8px 20px', cursor:'pointer', textTransform:'uppercase', position:'relative', overflow:'hidden' }}>
            <span style={{ position:'relative', zIndex:1 }}>EXECUTE</span>
          </button>
        </div>

        {/* Voice status bar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:6, fontFamily:'var(--mono)', fontSize:8.5, letterSpacing:1.5 }}>
          <div className={`v-dot ${voiceState}`}/>
          <span style={{ color: voiceState==='listen'?'var(--g)':voiceState==='error'?'var(--r)':voiceState==='speech'?'#ffcc00':'var(--dim)' }}>
            {statusMsg}
          </span>
          <span style={{ color:'rgba(0,212,255,0.5)', fontStyle:'italic', flex:1, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', fontSize:10 }}>
            {interimText ? `▸ ${interimText}` : ''}
          </span>
          <div style={{ display:'flex', gap:5 }}>
            {['AI news','Python','System health','ML','Joke'].map(c => (
              <button key={c} className="btn" style={{ fontSize:7.5, padding:'2px 7px', borderColor:'rgba(0,212,255,0.1)', color:'rgba(0,212,255,0.35)' }}
                onClick={() => handleSend(c)}>{c}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
