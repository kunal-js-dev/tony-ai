import React from 'react'

const HEIGHTS = [4, 8, 14, 18, 20, 16, 12, 7, 3]
const DELAYS  = [0, .1, .2, .3, .4, .35, .25, .15, .05]

export default function WaveVisualizer({ active = false }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:2, height:22 }}>
      {HEIGHTS.map((h, i) => (
        <div key={i} className={`wave-bar ${active ? 'active' : ''}`} style={{
          height: active ? h : 2,
          opacity: active ? 0.7 : 0.2,
          animationDelay: `${DELAYS[i]}s`,
          background:'var(--c)',
          transition: active ? 'none' : 'height .3s, opacity .3s'
        }}/>
      ))}
    </div>
  )
}
