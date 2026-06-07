import React, { useState, useEffect, useRef } from 'react'
import ArcGauge from '../components/ArcGauge'

function SparkLine({ data = [], color = '#00d4ff', height = 40 }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const w = 180, h = height
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4)}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display:'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" opacity=".8"/>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} opacity=".08"/>
    </svg>
  )
}

function BigGaugeRing({ value = 0, label, sublabel, color = '#00d4ff', size = 130 }) {
  const r = 50, circ = 2 * Math.PI * r
  const filled = (Math.min(value,100)/100)*circ
  const hot = value >= 85
  const c = hot ? '#ff2d55' : color
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
      <div style={{ position:'relative', width:size, height:size, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r={r} stroke="rgba(0,212,255,0.08)" strokeWidth="8"/>
          <circle cx="60" cy="60" r={r} stroke={c} strokeWidth="8"
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
            transform="rotate(-90 60 60)" opacity=".85"
            style={{ transition:'stroke-dasharray 0.9s ease, stroke .3s', filter:`drop-shadow(0 0 4px ${c})` }}/>
          <circle cx="60" cy="60" r="35" fill="rgba(0,10,25,0.6)" stroke="rgba(0,212,255,0.1)" strokeWidth=".5"/>
        </svg>
        <div style={{ position:'absolute', textAlign:'center' }}>
          <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:22, color:c, textShadow:`0 0 12px ${c}` }}>{Math.round(value)}%</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:2, color:'var(--dim)' }}>{label}</div>
        </div>
      </div>
      {sublabel && <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--dim)', letterSpacing:1.5 }}>{sublabel}</div>}
    </div>
  )
}

export default function SystemDashboard({ stats }) {
  const [cpuHist,  setCpuHist]  = useState(Array(40).fill(0))
  const [ramHist,  setRamHist]  = useState(Array(40).fill(0))
  const [diskHist, setDiskHist] = useState(Array(40).fill(0))

  useEffect(() => {
    if (!stats) return
    setCpuHist(p  => [...p.slice(-39), stats.cpu_percent  || 0])
    setRamHist(p  => [...p.slice(-39), stats.ram_percent  || 0])
    setDiskHist(p => [...p.slice(-39), stats.disk_percent || 0])
  }, [stats])

  const s = stats

  const cards = [
    { label:'CPU USAGE',    value:s?.cpu_percent||0, sub:`${s?.cpu_cores||0} cores · ${s?.cpu_freq_current||0}MHz`, color:'#00d4ff', hist:cpuHist },
    { label:'MEMORY',       value:s?.ram_percent||0, sub:`${s?.ram_used_gb||0} / ${s?.ram_total_gb||0} GB`, color:'#7c3aed', hist:ramHist },
    { label:'DISK',         value:s?.disk_percent||0, sub:`${s?.disk_used_gb||0} / ${s?.disk_total_gb||0} GB`, color:'#00ff88', hist:diskHist },
  ]

  const rows = [
    ['PROCESSOR',       s?.cpu_model || 'Unknown CPU'],
    ['ARCHITECTURE',    s?.os?.includes('64')?'x86_64':'x86'],
    ['CORES / THREADS', `${s?.cpu_cores||'--'} / ${s?.cpu_threads||'--'}`],
    ['CLOCK SPEED',     `${s?.cpu_freq_current||'--'} MHz (max ${s?.cpu_freq_max||'--'} MHz)`],
    ['OPERATING SYS',   s?.os || '--'],
    ['HOSTNAME',        s?.hostname || '--'],
    ['UPTIME',          `${s?.uptime_hours||'--'} hours`],
    ['PROCESSES',       s?.proc_count || '--'],
    ['NET DOWNLOAD',    `${s?.net_down_kb||0} KB/s`],
    ['NET UPLOAD',      `${s?.net_up_kb||0} KB/s`],
    ['BATTERY',         s?.battery_percent!=null ? `${s.battery_percent}% · ${s?.battery_plugged?'Charging':'On Battery'}` : 'No battery'],
  ]

  return (
    <div style={{ height:'100vh', overflowY:'auto', padding:5, display:'flex', flexDirection:'column', gap:5, animation:'pageIn .3s ease' }}>

      {/* Header */}
      <div className="panel" style={{ border:'none', borderBottom:'1px solid var(--bdr)', background:'rgba(0,5,15,0.92)', padding:'0 18px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:20, color:'var(--c)', letterSpacing:5, textShadow:'0 0 16px rgba(0,212,255,0.6)' }}>SYSTEM MONITOR</div>
        <div style={{ fontFamily:'var(--mono)', fontSize:8.5, color:'var(--dim)', letterSpacing:2 }}>LIVE · UPDATES EVERY 3 SECONDS</div>
      </div>

      {/* 3 big gauges + sparklines */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5, flexShrink:0 }}>
        {cards.map(c => (
          <div key={c.label} className="panel" style={{ padding:18, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
            <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
            <BigGaugeRing value={c.value} label={c.label} sublabel={c.sub} color={c.color}/>
            <div style={{ alignSelf:'stretch' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:7.5, color:'var(--dim)', letterSpacing:2, marginBottom:4 }}>HISTORY (40s)</div>
              <SparkLine data={c.hist} color={c.color}/>
            </div>
          </div>
        ))}
      </div>

      {/* Battery + Net row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:5, flexShrink:0 }}>
        {[
          { l:'BATTERY',    v:`${s?.battery_percent??'N/A'}%`, s2: s?.battery_plugged?'⚡ Charging':'🔋 Discharging', color:'#00ff88' },
          { l:'NET DOWN',   v:`${s?.net_down_kb||0}`,          s2:'KB / SECOND',  color:'#00d4ff' },
          { l:'NET UP',     v:`${s?.net_up_kb||0}`,            s2:'KB / SECOND',  color:'#7c3aed' },
          { l:'PROCESSES',  v:`${s?.proc_count||'--'}`,         s2:'RUNNING',      color:'#ffd60a' },
        ].map(c => (
          <div key={c.l} className="panel" style={{ padding:14 }}>
            <div className="ck tl"/><div className="ck tr"/>
            <div className="metric-label">{c.l}</div>
            <div className="metric-val" style={{ color:c.color, textShadow:`0 0 10px ${c.color}55` }}>{c.v}</div>
            <div className="metric-sub">{c.s2}</div>
            {c.l === 'BATTERY' && s?.battery_percent != null && (
              <div className="pbar" style={{ marginTop:6 }}>
                <div className={`pbar-fill${(s?.battery_percent||0)<=20?' hot':' good'}`} style={{ width:`${s?.battery_percent||0}%` }}/>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full system info table */}
      <div className="panel" style={{ padding:16, flex:1 }}>
        <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
        <div className="section-label">HARDWARE INFORMATION</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2px 20px' }}>
          {rows.map(([k,v],i) => (
            <div key={k} className="irow" style={{ borderBottom:'1px solid rgba(0,212,255,0.06)', paddingBottom:4, paddingTop:4 }}>
              <span className="ik" style={{ fontSize:9 }}>{k}</span>
              <span className="iv" style={{ fontSize:10, maxWidth:'60%', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
