import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

export const THEMES = {
  dark: {
    id: 'dark',
    label: 'CYBER',
    icon: '◉',
    accent: '#00d4ff',
    description: 'Deep space blue',
    vars: {
      '--c':    '#00d4ff',
      '--c2':   '#0055ff',
      '--c3':   '#7c3aed',
      '--g':    '#00ff88',
      '--r':    '#ff2d55',
      '--y':    '#ffd60a',
      '--bg':   '#020b14',
      '--bg2':  '#030f1e',
      '--bdr':  'rgba(0,212,255,0.14)',
      '--dim':  'rgba(0,212,255,0.4)',
      '--txt':  '#c0e0ff',
      '--nav-bg': 'rgba(0,8,20,0.98)',
      '--panel-bg': 'rgba(0,212,255,0.03)',
      '--input-bg': 'rgba(0,212,255,0.03)',
      '--input-border': 'rgba(0,212,255,0.18)',
      '--msg-user-color': '#ffe566',
      '--msg-ai-bg': 'rgba(0,30,60,0.2)',
      '--scrollbar': 'rgba(0,212,255,0.18)',
      '--glow': 'rgba(0,212,255,0.25)',
      '--gradient-a': '#00d4ff',
      '--gradient-b': '#7c3aed',
    }
  },

  cyberpunk: {
    id: 'cyberpunk',
    label: 'PUNK',
    icon: '⬡',
    accent: '#ff00ff',
    description: 'Neon magenta city',
    vars: {
      '--c':    '#ff00ff',
      '--c2':   '#cc00ff',
      '--c3':   '#ff6600',
      '--g':    '#00ffaa',
      '--r':    '#ff003c',
      '--y':    '#ffee00',
      '--bg':   '#0a0010',
      '--bg2':  '#12001a',
      '--bdr':  'rgba(255,0,255,0.18)',
      '--dim':  'rgba(255,0,255,0.5)',
      '--txt':  '#ffccff',
      '--nav-bg': 'rgba(10,0,16,0.98)',
      '--panel-bg': 'rgba(255,0,255,0.03)',
      '--input-bg': 'rgba(255,0,255,0.04)',
      '--input-border': 'rgba(255,0,255,0.22)',
      '--msg-user-color': '#ffee00',
      '--msg-ai-bg': 'rgba(80,0,80,0.25)',
      '--scrollbar': 'rgba(255,0,255,0.22)',
      '--glow': 'rgba(255,0,255,0.3)',
      '--gradient-a': '#ff00ff',
      '--gradient-b': '#ff6600',
    }
  },

  matrix: {
    id: 'matrix',
    label: 'MATRIX',
    icon: '◧',
    accent: '#00ff41',
    description: 'Green terminal rain',
    vars: {
      '--c':    '#00ff41',
      '--c2':   '#00bb30',
      '--c3':   '#00ff99',
      '--g':    '#39ff14',
      '--r':    '#ff2020',
      '--y':    '#ccff00',
      '--bg':   '#000800',
      '--bg2':  '#001200',
      '--bdr':  'rgba(0,255,65,0.14)',
      '--dim':  'rgba(0,255,65,0.45)',
      '--txt':  '#a0ffb0',
      '--nav-bg': 'rgba(0,6,0,0.98)',
      '--panel-bg': 'rgba(0,255,65,0.03)',
      '--input-bg': 'rgba(0,255,65,0.03)',
      '--input-border': 'rgba(0,255,65,0.2)',
      '--msg-user-color': '#ccff00',
      '--msg-ai-bg': 'rgba(0,40,10,0.3)',
      '--scrollbar': 'rgba(0,255,65,0.2)',
      '--glow': 'rgba(0,255,65,0.3)',
      '--gradient-a': '#00ff41',
      '--gradient-b': '#00bb30',
    }
  },

  aurora: {
    id: 'aurora',
    label: 'AURORA',
    icon: '◈',
    accent: '#7fffd4',
    description: 'Northern lights',
    vars: {
      '--c':    '#7fffd4',
      '--c2':   '#00ced1',
      '--c3':   '#9370db',
      '--g':    '#98ff98',
      '--r':    '#ff6b9d',
      '--y':    '#ffe4b5',
      '--bg':   '#040d1a',
      '--bg2':  '#060f22',
      '--bdr':  'rgba(127,255,212,0.14)',
      '--dim':  'rgba(127,255,212,0.45)',
      '--txt':  '#d0f0e8',
      '--nav-bg': 'rgba(4,10,22,0.98)',
      '--panel-bg': 'rgba(127,255,212,0.03)',
      '--input-bg': 'rgba(127,255,212,0.04)',
      '--input-border': 'rgba(127,255,212,0.18)',
      '--msg-user-color': '#ffe4b5',
      '--msg-ai-bg': 'rgba(0,40,60,0.25)',
      '--scrollbar': 'rgba(127,255,212,0.2)',
      '--glow': 'rgba(127,255,212,0.25)',
      '--gradient-a': '#7fffd4',
      '--gradient-b': '#9370db',
    }
  },

  midnight: {
    id: 'midnight',
    label: 'NIGHT',
    icon: '◑',
    accent: '#6c8eff',
    description: 'Deep midnight blue',
    vars: {
      '--c':    '#6c8eff',
      '--c2':   '#4466ff',
      '--c3':   '#a78bfa',
      '--g':    '#34d399',
      '--r':    '#f87171',
      '--y':    '#fbbf24',
      '--bg':   '#030712',
      '--bg2':  '#050d1f',
      '--bdr':  'rgba(108,142,255,0.14)',
      '--dim':  'rgba(108,142,255,0.45)',
      '--txt':  '#cbd5f0',
      '--nav-bg': 'rgba(3,5,18,0.98)',
      '--panel-bg': 'rgba(108,142,255,0.04)',
      '--input-bg': 'rgba(108,142,255,0.04)',
      '--input-border': 'rgba(108,142,255,0.2)',
      '--msg-user-color': '#fbbf24',
      '--msg-ai-bg': 'rgba(20,30,80,0.3)',
      '--scrollbar': 'rgba(108,142,255,0.2)',
      '--glow': 'rgba(108,142,255,0.28)',
      '--gradient-a': '#6c8eff',
      '--gradient-b': '#a78bfa',
    }
  },

  sunset: {
    id: 'sunset',
    label: 'SUNSET',
    icon: '◕',
    accent: '#ff8c42',
    description: 'Golden hour warmth',
    vars: {
      '--c':    '#ff8c42',
      '--c2':   '#ff4500',
      '--c3':   '#ff1493',
      '--g':    '#7fff00',
      '--r':    '#ff3030',
      '--y':    '#ffd700',
      '--bg':   '#0f0500',
      '--bg2':  '#1a0800',
      '--bdr':  'rgba(255,140,66,0.16)',
      '--dim':  'rgba(255,140,66,0.5)',
      '--txt':  '#ffe8cc',
      '--nav-bg': 'rgba(15,5,0,0.98)',
      '--panel-bg': 'rgba(255,140,66,0.04)',
      '--input-bg': 'rgba(255,140,66,0.04)',
      '--input-border': 'rgba(255,140,66,0.22)',
      '--msg-user-color': '#ffd700',
      '--msg-ai-bg': 'rgba(80,30,0,0.3)',
      '--scrollbar': 'rgba(255,140,66,0.22)',
      '--glow': 'rgba(255,140,66,0.3)',
      '--gradient-a': '#ff8c42',
      '--gradient-b': '#ff1493',
    }
  },

  white: {
    id: 'white',
    label: 'LIGHT',
    icon: '○',
    accent: '#0077cc',
    description: 'Clean minimal light',
    vars: {
      '--c':    '#0077cc',
      '--c2':   '#004999',
      '--c3':   '#6d28d9',
      '--g':    '#16a34a',
      '--r':    '#dc2626',
      '--y':    '#b45309',
      '--bg':   '#f0f4f8',
      '--bg2':  '#e2eaf2',
      '--bdr':  'rgba(0,100,200,0.18)',
      '--dim':  'rgba(0,100,180,0.55)',
      '--txt':  '#1e3a5f',
      '--nav-bg': 'rgba(230,238,248,0.98)',
      '--panel-bg': 'rgba(255,255,255,0.7)',
      '--input-bg': 'rgba(255,255,255,0.9)',
      '--input-border': 'rgba(0,100,200,0.25)',
      '--msg-user-color': '#92400e',
      '--msg-ai-bg': 'rgba(224,240,255,0.5)',
      '--scrollbar': 'rgba(0,100,200,0.2)',
      '--glow': 'rgba(0,100,200,0.15)',
      '--gradient-a': '#0077cc',
      '--gradient-b': '#6d28d9',
    }
  },

  arc: {
    id: 'arc',
    label: 'ARC',
    icon: '⬢',
    accent: '#ff6b35',
    description: 'Arc reactor orange',
    vars: {
      '--c':    '#ff6b35',
      '--c2':   '#ff3d00',
      '--c3':   '#c62828',
      '--g':    '#69f0ae',
      '--r':    '#ff1744',
      '--y':    '#ffeb3b',
      '--bg':   '#0d0d0d',
      '--bg2':  '#1a0a00',
      '--bdr':  'rgba(255,107,53,0.18)',
      '--dim':  'rgba(255,107,53,0.5)',
      '--txt':  '#ffe0cc',
      '--nav-bg': 'rgba(13,5,0,0.98)',
      '--panel-bg': 'rgba(255,107,53,0.03)',
      '--input-bg': 'rgba(255,107,53,0.03)',
      '--input-border': 'rgba(255,107,53,0.2)',
      '--msg-user-color': '#ffcc80',
      '--msg-ai-bg': 'rgba(60,20,0,0.3)',
      '--scrollbar': 'rgba(255,107,53,0.2)',
      '--glow': 'rgba(255,107,53,0.28)',
      '--gradient-a': '#ff6b35',
      '--gradient-b': '#c62828',
    }
  }
}

export function ThemeProvider({ children, initTheme }) {
  const [themeId, setThemeId] = useState(() => {
    const saved = initTheme || localStorage.getItem('tony_theme') || 'dark'
    return THEMES[saved] ? saved : 'dark'
  })

  const theme = THEMES[themeId] || THEMES.dark

  useEffect(() => {
    const root = document.documentElement
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v))
    root.setAttribute('data-theme', themeId)
    localStorage.setItem('tony_theme', themeId)
  }, [themeId, theme])

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, theme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
