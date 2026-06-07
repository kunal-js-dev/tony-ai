import React from 'react'

export function renderText(text) {
  if (!text) return null
  const parts = text.split(/(```[\s\S]*?```)/g)
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const lines  = part.slice(3).split('\n')
      const lang   = lines[0].trim()
      const code   = lines.slice(1).join('\n').replace(/```$/, '')
      return <pre key={i}><code className={lang}>{code}</code></pre>
    }
    // inline code
    const inlineParts = part.split(/(`[^`]+`)/g)
    return (
      <span key={i}>
        {inlineParts.map((ip, j) =>
          ip.startsWith('`') && ip.endsWith('`')
            ? <code key={j}>{ip.slice(1,-1)}</code>
            : ip
        )}
      </span>
    )
  })
}
