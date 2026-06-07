import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'

const NAV_ITEMS = [
  { id: 'hud',       icon: '⬡', label: 'HUD'  },
  { id: 'chat',      icon: '◈', label: 'CHAT' },
  { id: 'docs',      icon: '◫', label: 'DOCS' },
  { id: 'system',    icon: '◎', label: 'SYS'  },
  { id: 'control',   icon: '⬢', label: 'CTRL' },
  { id: 'analytics', icon: '◆', label: 'DATA' },
  { id: 'profile',   icon: '◉', label: 'USER' },
]

export default function Navbar({ active, onChange, ollamaOnline }) {
  const { themeId, setThemeId, themes } = useTheme()
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef(null)

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  const currentTheme = themes[themeId] || themes.dark

  return (
    <>
      <nav style={{
        width: 64, height: '100vh',
        background: 'var(--nav-bg)',
        borderRight: '1px solid var(--bdr)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        position: 'fixed', left: 0, top: 0, zIndex: 200,
        paddingTop: 12, paddingBottom: 16,
        gap: 4,
        transition: 'background 0.4s ease, border-color 0.4s ease',
      }}>

        {/* Logo */}
        <div style={{ marginBottom: 16, padding: '8px 0' }}>
          <div style={{
            width: 34, height: 34,
            borderRadius: '50%',
            border: '1px solid var(--bdr)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
            boxShadow: '0 0 14px var(--glow)',
            transition: 'all 0.4s ease',
          }}>
            <span style={{ fontSize: 16 }}>⚡</span>
          </div>
        </div>

        {/* Nav items */}
        {NAV_ITEMS.map(item => (
          <button key={item.id}
            id={`nav-btn-${item.id}`}
            onClick={() => onChange(item.id)}
            title={item.label}
            style={{
              width: 48, height: 48,
              background: active === item.id ? 'rgba(0,0,0,0.3)' : 'transparent',
              border: `1px solid ${active === item.id ? 'var(--bdr)' : 'rgba(0,0,0,0)'}`,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
              transition: 'all 0.18s',
              position: 'relative',
              boxShadow: active === item.id ? '0 0 14px var(--glow)' : 'none',
              outline: 'none',
            }}
            onMouseEnter={e => {
              if (active !== item.id) {
                e.currentTarget.style.borderColor = 'var(--bdr)'
                e.currentTarget.style.background = 'rgba(0,0,0,0.2)'
              }
            }}
            onMouseLeave={e => {
              if (active !== item.id) {
                e.currentTarget.style.borderColor = 'rgba(0,0,0,0)'
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            {/* Active indicator bar */}
            {active === item.id && (
              <div style={{
                position: 'absolute', left: 0, top: '20%', height: '60%',
                width: 2, background: 'var(--c)',
                boxShadow: '0 0 8px var(--c)', borderRadius: '0 2px 2px 0',
              }}/>
            )}
            <span style={{
              fontSize: 16,
              color: active === item.id ? 'var(--c)' : 'var(--dim)',
              transition: 'color 0.2s',
            }}>
              {item.icon}
            </span>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 6.5, letterSpacing: 1,
              color: active === item.id ? 'var(--c)' : 'var(--dim)',
              opacity: active === item.id ? 1 : 0.6,
              transition: 'color 0.2s',
            }}>
              {item.label}
            </span>
          </button>
        ))}

        {/* Bottom: theme toggle + status */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          {/* Theme picker button */}
          <button
            id="theme-picker-btn"
            onClick={() => setPickerOpen(v => !v)}
            title="Change theme"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `1px solid ${pickerOpen ? 'var(--c)' : 'var(--bdr)'}`,
              background: pickerOpen ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, transition: 'all 0.2s',
              color: pickerOpen ? 'var(--c)' : 'var(--dim)',
              boxShadow: pickerOpen ? '0 0 12px var(--glow)' : 'none',
              outline: 'none',
            }}
            onMouseEnter={e => { if (!pickerOpen) { e.currentTarget.style.borderColor = 'var(--c)'; e.currentTarget.style.color = 'var(--c)' } }}
            onMouseLeave={e => { if (!pickerOpen) { e.currentTarget.style.borderColor = 'var(--bdr)'; e.currentTarget.style.color = 'var(--dim)' } }}
          >
            {currentTheme.icon}
          </button>

          {/* Online status */}
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: ollamaOnline ? 'var(--g)' : 'var(--r)',
            boxShadow: `0 0 8px ${ollamaOnline ? 'var(--g)' : 'var(--r)'}`,
            animation: 'blink 2s infinite',
          }}/>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 6, color: 'var(--dim)', letterSpacing: 1 }}>
            {ollamaOnline ? 'LIVE' : 'OFF'}
          </span>
        </div>
      </nav>

      {/* Floating theme picker panel */}
      {pickerOpen && (
        <div
          ref={pickerRef}
          id="theme-picker-panel"
          style={{
            position: 'fixed',
            left: 72,
            bottom: 60,
            zIndex: 300,
            width: 280,
            background: 'rgba(0,0,0,0.9)',
            border: '1px solid var(--bdr)',
            borderRadius: 8,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 1px var(--c)',
            padding: '14px 12px',
            animation: 'themePanelIn 0.2s ease',
          }}
        >
          {/* Arrow pointer */}
          <div style={{
            position: 'absolute', left: -6, bottom: 20,
            width: 10, height: 10,
            background: 'rgba(0,0,0,0.9)',
            border: '1px solid var(--bdr)',
            borderRight: 'none', borderTop: 'none',
            transform: 'rotate(45deg)',
            borderRadius: '0 0 0 2px',
          }}/>

          <div style={{
            fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 3,
            color: 'var(--dim)', marginBottom: 12, paddingBottom: 8,
            borderBottom: '1px solid var(--bdr)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ color: 'var(--c)' }}>◈</span> INTERFACE THEME
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {Object.values(themes).map(t => {
              const isActive = themeId === t.id
              return (
                <button
                  key={t.id}
                  id={`theme-opt-${t.id}`}
                  onClick={() => { setThemeId(t.id); setPickerOpen(false) }}
                  style={{
                    padding: '10px 8px',
                    border: `1px solid ${isActive ? t.accent : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 5,
                    background: isActive ? `${t.accent}15` : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.15s',
                    outline: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = `${t.accent}60`
                      e.currentTarget.style.background = `${t.accent}0a`
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                    }
                  }}
                >
                  {/* Color swatch */}
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: `radial-gradient(circle at 35% 35%, ${t.accent}cc, ${t.accent}44)`,
                    boxShadow: isActive ? `0 0 8px ${t.accent}80` : 'none',
                    border: `1px solid ${t.accent}40`,
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11,
                  }}>
                    {t.icon}
                  </div>

                  <div style={{ textAlign: 'left', minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1.5,
                      color: isActive ? t.accent : '#aaa',
                      fontWeight: isActive ? 700 : 400,
                      transition: 'color 0.2s',
                    }}>
                      {t.label}
                    </div>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: 0.5,
                      color: 'rgba(255,255,255,0.3)',
                      marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {t.description}
                    </div>
                  </div>

                  {isActive && (
                    <div style={{
                      position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                      width: 5, height: 5, borderRadius: '50%',
                      background: t.accent,
                      boxShadow: `0 0 6px ${t.accent}`,
                    }}/>
                  )}
                </button>
              )
            })}
          </div>

          <div style={{
            marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)',
            fontFamily: 'var(--mono)', fontSize: 7, letterSpacing: 1,
            color: 'rgba(255,255,255,0.2)', textAlign: 'center',
          }}>
            ACTIVE: {currentTheme.label} · {currentTheme.description}
          </div>
        </div>
      )}

      <style>{`
        @keyframes themePanelIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
