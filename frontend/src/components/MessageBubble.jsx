import React from 'react'
import { renderText } from '../utils/renderText'

export default function MessageBubble({ text, role, source, timestamp }) {
  return (
    <div className={`msg ${role}`}>
      <div className="msg-av">{role === 'user' ? 'YOU' : 'AI'}</div>
      <div className="msg-bw">
        <div className="msg-bub">
          {role === 'ai' ? renderText(text) : text}
          {role === 'ai' && source && (
            <span className={`stag ${source}`} style={{ marginLeft:8 }}>
              {source.toUpperCase()}
            </span>
          )}
        </div>
        <div className="msg-meta">{timestamp}</div>
      </div>
    </div>
  )
}
