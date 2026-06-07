import React from 'react'

const CIRC = 2 * Math.PI * 36 // r=36 → ~226

export default function ArcGauge({ value = 0, label = 'CPU', size = 110, isSpeaking = false }) {
  const filled = (Math.min(value, 100) / 100) * CIRC
  const hot    = value >= 85
  const color  = hot ? '#ff2d55' : '#00d4ff'

  return (
    <div style={{ position:'relative', width:size, height:size, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg width={size} height={size} viewBox="0 0 110 110" fill="none">
        {/* hex outline */}
        <polygon points="55,6 97,30 97,80 55,104 13,80 13,30"
          fill="none" stroke="#00d4ff" strokeWidth=".6" opacity=".14"/>
        {/* rings */}
        <circle cx="55" cy="55" r="36" fill="none" stroke="#0055ff" strokeWidth="1"
          strokeDasharray="6 4" opacity=".28">
          <animateTransform attributeName="transform" type="rotate" from="0 55 55" to="360 55 55" dur="7s" repeatCount="indefinite"/>
        </circle>
        <circle cx="55" cy="55" r="26" fill="none" stroke="#7c3aed" strokeWidth=".7"
          strokeDasharray="3 7" opacity=".3">
          <animateTransform attributeName="transform" type="rotate" from="0 55 55" to="-360 55 55" dur="13s" repeatCount="indefinite"/>
        </circle>
        <circle cx="55" cy="55" r="17" fill="none" stroke="#00d4ff" strokeWidth=".6"
          strokeDasharray="2 5" opacity=".32">
          <animateTransform attributeName="transform" type="rotate" from="0 55 55" to="360 55 55" dur="5s" repeatCount="indefinite"/>
        </circle>
        {/* core */}
        <circle cx="55" cy="55" r="11" fill="rgba(0,50,180,.12)" stroke="#00d4ff" strokeWidth=".8">
          <animate attributeName="r" values="11;13;11" dur="3s" repeatCount="indefinite"/>
        </circle>
        {/* progress arc */}
        <circle cx="55" cy="55" r="36"
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={`${filled} ${CIRC}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          opacity=".8"
          style={{ transition:'stroke-dasharray 0.9s ease, stroke 0.3s' }}
        />
      </svg>
      {/* center label */}
      <div style={{
        position:'absolute', textAlign:'center',
        animation: isSpeaking ? 'corepulse 0.7s ease-in-out infinite' : 'none'
      }}>
        <div style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:20, color, lineHeight:1,
          textShadow:`0 0 ${isSpeaking?'28':'12'}px ${color}` }}>
          {Math.round(value)}%
        </div>
        <div style={{ fontFamily:'var(--mono)', fontSize:8, letterSpacing:2, color:'var(--dim)', marginTop:2 }}>
          {label}
        </div>
      </div>
    </div>
  )
}
