import React from 'react'

export default function ArcReactor({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
      <circle cx="25" cy="25" r="23" stroke="#00d4ff" strokeWidth=".4" opacity=".2"/>
      <circle cx="25" cy="25" r="18" stroke="#00d4ff" strokeWidth=".5" opacity=".35"/>
      <circle cx="25" cy="25" r="12" stroke="#00d4ff" strokeWidth=".7" opacity=".55">
        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="10s" repeatCount="indefinite"/>
      </circle>
      <circle cx="25" cy="25" r="7" fill="rgba(0,60,200,0.3)" stroke="#0050ff" strokeWidth="1"/>
      <circle cx="25" cy="25" r="4" fill="#00d4ff" opacity=".88">
        <animate attributeName="opacity" values=".88;.4;.88" dur="2.5s" repeatCount="indefinite"/>
        <animate attributeName="r" values="4;5.5;4" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      {/* Main fins */}
      <polygon points="25,4 27,17 25,25 23,17" fill="#00d4ff" opacity=".5"/>
      <polygon points="46,25 33,23 25,25 33,27" fill="#00d4ff" opacity=".5"/>
      <polygon points="25,46 23,33 25,25 27,33" fill="#00d4ff" opacity=".5"/>
      <polygon points="4,25  17,27 25,25 17,23"  fill="#00d4ff" opacity=".5"/>
      {/* Diagonal fins purple */}
      <polygon points="38,12 31,21 25,25 28,18" fill="#7c3aed" opacity=".4"/>
      <polygon points="38,38 28,31 25,25 31,28" fill="#7c3aed" opacity=".4"/>
      <polygon points="12,38 18,28 25,25 22,31" fill="#7c3aed" opacity=".4"/>
      <polygon points="12,12 22,18 25,25 18,22" fill="#7c3aed" opacity=".4"/>
    </svg>
  )
}
