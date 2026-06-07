import React, { useState } from 'react'
import { launchApp, doSystemAction } from '../utils/api'

const APPS = [
  { icon:'📝', name:'Notepad',      app:'notepad',      cat:'TOOLS' },
  { icon:'🔢', name:'Calculator',   app:'calculator',   cat:'TOOLS' },
  { icon:'🎨', name:'Paint',        app:'paint',        cat:'TOOLS' },
  { icon:'📁', name:'File Explorer',app:'explorer',     cat:'TOOLS' },
  { icon:'⬛', name:'CMD',          app:'cmd',          cat:'SYSTEM' },
  { icon:'🔷', name:'PowerShell',   app:'powershell',   cat:'SYSTEM' },
  { icon:'📊', name:'Task Manager', app:'task manager', cat:'SYSTEM' },
  { icon:'⚙️', name:'Settings',     app:'settings',     cat:'SYSTEM' },
  { icon:'💻', name:'VS Code',      app:'vscode',       cat:'DEV' },
  { icon:'🌐', name:'Chrome',       app:'chrome',       cat:'BROWSER' },
  { icon:'🦊', name:'Firefox',      app:'firefox',      cat:'BROWSER' },
  { icon:'📧', name:'Outlook',      app:'outlook',      cat:'OFFICE' },
  { icon:'📊', name:'Excel',        app:'excel',        cat:'OFFICE' },
  { icon:'📄', name:'Word',         app:'word',         cat:'OFFICE' },
  { icon:'🎵', name:'Media Player', app:'media player', cat:'MEDIA' },
  { icon:'📷', name:'Camera',       app:'camera',       cat:'MEDIA' },
]

const ACTIONS = [
  { icon:'📸', name:'Screenshot',   action:'screenshot',  color:'var(--c)',  cat:'CAPTURE' },
  { icon:'🔒', name:'Lock Screen',  action:'lock',        color:'var(--y)',  cat:'SECURITY' },
  { icon:'🔊', name:'Volume Up',    action:'volume_up',   color:'var(--g)',  cat:'AUDIO' },
  { icon:'🔉', name:'Volume Down',  action:'volume_down', color:'var(--g)',  cat:'AUDIO' },
  { icon:'🔇', name:'Mute Toggle',  action:'mute',        color:'var(--g)',  cat:'AUDIO' },
  { icon:'🗑️', name:'Empty Bin',   action:'empty_bin',   color:'var(--dim)',cat:'CLEANUP' },
  { icon:'😴', name:'Sleep',        action:'sleep',       color:'var(--y)',  cat:'POWER', danger:true },
  { icon:'🔄', name:'Restart',      action:'restart',     color:'var(--y)',  cat:'POWER', danger:true },
  { icon:'⏻',  name:'Shutdown',     action:'shutdown',    color:'var(--r)',  cat:'POWER', danger:true },
]

export default function ControlDashboard() {
  const [log,    setLog]    = useState([])
  const [filter, setFilter] = useState('ALL')

  const addLog = (msg, type='ok') => {
    const entry = { id: Date.now(), msg, type, time: new Date().toLocaleTimeString('en-US',{hour12:false}) }
    setLog(prev => [entry, ...prev].slice(0, 20))
  }

  const handleLaunch = async (app, name) => {
    addLog(`Launching ${name}...`, 'info')
    try {
      const d = await launchApp(app)
      addLog(d.response || `${name} launched.`, d.success !== false ? 'ok' : 'err')
    } catch (e) { addLog(`Failed: ${name}`, 'err') }
  }

  const handleAction = async (action, name) => {
    addLog(`Executing: ${name}`, 'info')
    try {
      const d = await doSystemAction(action)
      addLog(d.response || `${name} done.`, 'ok')
    } catch (e) { addLog(`Failed: ${name}`, 'err') }
  }

  const cats = ['ALL', ...new Set(APPS.map(a => a.cat))]
  const filtered = filter === 'ALL' ? APPS : APPS.filter(a => a.cat === filter)

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', gap:5, padding:5, animation:'pageIn .3s ease' }}>

      {/* Header */}
      <div className="panel" style={{ flexShrink:0, border:'none', borderBottom:'1px solid var(--bdr)', background:'rgba(0,5,15,0.92)', padding:'0 18px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:20, color:'var(--c)', letterSpacing:5, textShadow:'0 0 16px rgba(0,212,255,0.6)' }}>CONTROL CENTER</div>
        <div style={{ fontFamily:'var(--mono)', fontSize:8.5, color:'var(--dim)', letterSpacing:2 }}>APP LAUNCHER · SYSTEM ACTIONS</div>
      </div>

      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 320px', gap:5, overflow:'hidden' }}>

        {/* Left: Apps + Actions */}
        <div style={{ overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>

          {/* App Launcher */}
          <div className="panel" style={{ padding:16 }}>
            <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div className="section-label" style={{ margin:0 }}>APP LAUNCHER</div>
              <div style={{ display:'flex', gap:4 }}>
                {cats.map(c => (
                  <button key={c} className={`btn${filter===c?' active':''}`} style={{ fontSize:7.5, padding:'3px 8px' }}
                    onClick={() => setFilter(c)}>{c}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:6 }}>
              {filtered.map(a => (
                <button key={a.app} onClick={() => handleLaunch(a.app, a.name)}
                  style={{ background:'rgba(0,212,255,0.03)', border:'1px solid rgba(0,212,255,0.1)', padding:'12px 8px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, transition:'all .15s', borderRadius:2 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,212,255,0.4)'; e.currentTarget.style.background='rgba(0,212,255,0.07)'; e.currentTarget.style.boxShadow='0 0 14px rgba(0,212,255,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(0,212,255,0.1)'; e.currentTarget.style.background='rgba(0,212,255,0.03)'; e.currentTarget.style.boxShadow='none' }}>
                  <span style={{ fontSize:24 }}>{a.icon}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:8.5, color:'rgba(0,212,255,0.6)', letterSpacing:1, textAlign:'center' }}>{a.name.toUpperCase()}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'rgba(0,212,255,0.25)', letterSpacing:1 }}>{a.cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* System Actions */}
          <div className="panel" style={{ padding:16 }}>
            <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
            <div className="section-label">SYSTEM ACTIONS</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px, 1fr))', gap:6 }}>
              {ACTIONS.map(a => (
                <button key={a.action} onClick={() => handleAction(a.action, a.name)}
                  style={{ background: a.danger ? 'rgba(255,45,85,0.03)' : 'rgba(0,212,255,0.03)', border:`1px solid ${a.danger?'rgba(255,45,85,0.18)':'rgba(0,212,255,0.1)'}`, padding:'12px 8px', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, transition:'all .15s', borderRadius:2 }}
                  onMouseEnter={e => { const c=a.danger?'rgba(255,45,85':'rgba(0,212,255'; e.currentTarget.style.borderColor=`${c},0.5)`; e.currentTarget.style.background=`${c},0.08)` }}
                  onMouseLeave={e => { const c=a.danger?'rgba(255,45,85':'rgba(0,212,255'; e.currentTarget.style.borderColor=`${c},0.18)`; e.currentTarget.style.background=`${c},0.03)` }}>
                  <span style={{ fontSize:22 }}>{a.icon}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:8.5, color: a.danger?'rgba(255,45,85,0.7)':'rgba(0,212,255,0.6)', letterSpacing:1 }}>{a.name.toUpperCase()}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:7, color:'rgba(0,212,255,0.25)', letterSpacing:1 }}>{a.cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Activity Log */}
        <div className="panel" style={{ padding:14, display:'flex', flexDirection:'column' }}>
          <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div className="section-label" style={{ margin:0 }}>ACTIVITY LOG</div>
            <button className="btn danger" style={{ fontSize:7.5, padding:'2px 8px' }} onClick={() => setLog([])}>CLEAR</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
            {log.length === 0 && (
              <div style={{ fontFamily:'var(--mono)', fontSize:8.5, color:'rgba(0,212,255,0.2)', letterSpacing:1.5, textAlign:'center', marginTop:20 }}>NO ACTIVITY YET</div>
            )}
            {log.map(l => (
              <div key={l.id} style={{ padding:'6px 10px', background:'rgba(0,212,255,0.03)', border:`1px solid ${l.type==='err'?'rgba(255,45,85,0.2)':l.type==='info'?'rgba(0,212,255,0.1)':'rgba(0,255,136,0.15)'}`, borderRadius:2, animation:'msgslide .2s ease' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, color: l.type==='err'?'var(--r)':l.type==='info'?'var(--c)':'var(--g)', marginBottom:2 }}>{l.msg}</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'rgba(0,212,255,0.3)' }}>{l.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
