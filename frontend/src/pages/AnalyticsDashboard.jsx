import React, { useState, useEffect } from "react"

function BarChart({ data, color = "#00d4ff", height = 80 }) {
  const max = Math.max(...data.map(d => d.v), 1)
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:3, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <div style={{ width:"100%", background:`linear-gradient(180deg,${color},${color}55)`, borderRadius:"2px 2px 0 0", height:`${(d.v/max)*height}px`, minHeight:2, boxShadow:`0 0 6px ${color}44`, transition:"height .6s ease" }}/>
          <div style={{ fontFamily:"var(--mono)", fontSize:7, color:"var(--dim)", letterSpacing:1 }}>{d.l}</div>
        </div>
      ))}
    </div>
  )
}

function LineChart({ datasets = [], height = 100 }) {
  const allVals = datasets.flatMap(d => d.data)
  const max = Math.max(...allVals, 1)
  return (
    <svg width="100%" height={height} style={{ display:"block", overflow:"visible" }}>
      {datasets.map((ds, di) => {
        const n = ds.data.length
        const p = ds.data.map((v, i) => `${(i/(n-1))*100} ${100-(v/max)*96}`).join(" L ")
        return (
          <g key={di}>
            <path d={`M ${p}`} fill="none" stroke={ds.color} strokeWidth="1.5" opacity=".85" vectorEffect="non-scaling-stroke"/>
            <path d={`M ${p} L 100 100 L 0 100 Z`} fill={ds.color} opacity=".07"/>
          </g>
        )
      })}
      {[25,50,75].map(y => <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="rgba(0,212,255,0.06)" strokeDasharray="3 4"/>)}
    </svg>
  )
}

function StatCard({ label, value, unit, delta, color = "#00d4ff" }) {
  const up = delta > 0
  return (
    <div className="panel" style={{ padding:16 }}>
      <div className="ck tl"/><div className="ck tr"/>
      <div className="metric-label">{label}</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:6, marginTop:4 }}>
        <div className="metric-val" style={{ color, textShadow:`0 0 10px ${color}55`, fontSize:26 }}>{value}</div>
        <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--dim)" }}>{unit}</div>
      </div>
      {delta !== undefined && (
        <div style={{ fontFamily:"var(--mono)", fontSize:9, color:up?"var(--g)":"var(--r)", marginTop:4 }}>
          {up?"▲":"▼"} {Math.abs(delta).toFixed(1)} from prev
        </div>
      )}
    </div>
  )
}

export default function AnalyticsDashboard({ stats }) {
  const [cpuLog,  setCpuLog]  = useState(Array(20).fill(0))
  const [ramLog,  setRamLog]  = useState(Array(20).fill(0))
  const [netDLog, setNetDLog] = useState(Array(20).fill(0))
  const [netULog, setNetULog] = useState(Array(20).fill(0))

  useEffect(() => {
    if (!stats) return
    setCpuLog(p  => [...p.slice(-19), stats.cpu_percent  || 0])
    setRamLog(p  => [...p.slice(-19), stats.ram_percent  || 0])
    setNetDLog(p => [...p.slice(-19), stats.net_down_kb  || 0])
    setNetULog(p => [...p.slice(-19), stats.net_up_kb    || 0])
  }, [stats])

  const s = stats
  const hours = ["0h","3h","6h","9h","12h","15h","18h","21h"]
  const cpuMock  = [22,35,41,28,55,62,48,39].map((v,i) => ({ l:hours[i], v }))
  const ramMock  = [45,48,52,50,61,64,58,55].map((v,i) => ({ l:hours[i], v }))
  const diskMock = [72,72,73,73,74,74,74,75].map((v,i) => ({ l:hours[i], v }))

  return (
    <div style={{ height:"100vh", overflowY:"auto", padding:5, display:"flex", flexDirection:"column", gap:5, animation:"pageIn .3s ease" }}>
      <div className="panel" style={{ flexShrink:0, border:"none", borderBottom:"1px solid var(--bdr)", background:"rgba(0,5,15,0.92)", padding:"0 18px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontFamily:"var(--mono)", fontWeight:700, fontSize:20, color:"var(--c)", letterSpacing:5, textShadow:"0 0 16px rgba(0,212,255,0.6)" }}>ANALYTICS</div>
        <div style={{ fontFamily:"var(--mono)", fontSize:8.5, color:"var(--dim)", letterSpacing:2 }}>PERFORMANCE METRICS · LIVE DATA</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5, flexShrink:0 }}>
        <StatCard label="CPU LOAD"   value={s?.cpu_percent?.toFixed(1)||"--"} unit="%" delta={cpuLog[cpuLog.length-1]-cpuLog[cpuLog.length-2]} color="#00d4ff"/>
        <StatCard label="RAM USAGE"  value={s?.ram_percent?.toFixed(1)||"--"}  unit="%" delta={ramLog[ramLog.length-1]-ramLog[ramLog.length-2]}  color="#7c3aed"/>
        <StatCard label="NET DOWN"   value={s?.net_down_kb||0}                  unit="KB/s" color="#00ff88"/>
        <StatCard label="DISK USAGE" value={s?.disk_percent?.toFixed(1)||"--"} unit="%" color="#ffd60a"/>
      </div>
      <div className="panel" style={{ padding:16, flexShrink:0 }}>
        <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div className="section-label" style={{ margin:0 }}>LIVE PERFORMANCE (LAST 20 READS)</div>
          <div style={{ display:"flex", gap:12 }}>
            {[{c:"#00d4ff",l:"CPU"},{c:"#7c3aed",l:"RAM"},{c:"#00ff88",l:"NET"}].map(x=>(
              <div key={x.l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:12, height:2, background:x.c }}/>
                <span style={{ fontFamily:"var(--mono)", fontSize:8, color:"var(--dim)" }}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>
        <LineChart height={100} datasets={[{data:cpuLog,color:"#00d4ff"},{data:ramLog,color:"#7c3aed"},{data:netDLog.map(v=>Math.min(v/5,100)),color:"#00ff88"}]}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5, flexShrink:0 }}>
        {[{l:"CPU USAGE TODAY",d:cpuMock,c:"#00d4ff"},{l:"RAM USAGE TODAY",d:ramMock,c:"#7c3aed"},{l:"DISK USAGE TODAY",d:diskMock,c:"#00ff88"}].map(({l,d,c})=>(
          <div key={l} className="panel" style={{ padding:16 }}>
            <div className="ck tl"/><div className="ck tr"/>
            <div className="section-label">{l}</div>
            <BarChart data={d} color={c} height={80}/>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, flexShrink:0 }}>
        <div className="panel" style={{ padding:16 }}>
          <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
          <div className="section-label">NETWORK THROUGHPUT (LIVE)</div>
          <LineChart height={70} datasets={[{data:netDLog,color:"#00ff88"},{data:netULog,color:"#ffd60a"}]}/>
          <div style={{ display:"flex", gap:14, marginTop:8 }}>
            {[{c:"#00ff88",l:"DOWNLOAD",v:`${s?.net_down_kb||0} KB/s`},{c:"#ffd60a",l:"UPLOAD",v:`${s?.net_up_kb||0} KB/s`}].map(x=>(
              <div key={x.l} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:8, height:8, borderRadius:2, background:x.c }}/>
                <span style={{ fontFamily:"var(--mono)", fontSize:8.5, color:x.c }}>{x.l}: {x.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel" style={{ padding:16 }}>
          <div className="ck tl"/><div className="ck tr"/><div className="ck bl"/><div className="ck br"/>
          <div className="section-label">SYSTEM SUMMARY</div>
          {[["CPU MODEL",s?.cpu_model||"--"],["CORES",`${s?.cpu_cores||"--"} physical / ${s?.cpu_threads||"--"} logical`],["CLOCK",`${s?.cpu_freq_current||"--"} MHz`],["RAM TOTAL",`${s?.ram_total_gb||"--"} GB`],["DISK TOTAL",`${s?.disk_total_gb||"--"} GB`],["PROCESSES",`${s?.proc_count||"--"}`],["OS",s?.os||"--"],["UPTIME",`${s?.uptime_hours||"--"} hours`]].map(([k,v])=>(
            <div key={k} className="irow" style={{ borderBottom:"1px solid rgba(0,212,255,0.05)" }}>
              <span className="ik" style={{ fontSize:8.5 }}>{k}</span>
              <span className="iv" style={{ fontSize:9.5, maxWidth:"65%", textOverflow:"ellipsis", overflow:"hidden", whiteSpace:"nowrap", textAlign:"right" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
