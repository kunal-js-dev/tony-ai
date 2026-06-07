import React from 'react'
import { useTheme } from '../context/ThemeContext'

const BG_CONFIGS = {
  dark: {
    stars: [
      'radial-gradient(1px 1px at 15% 25%, rgba(0,212,255,0.55) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 75% 15%, rgba(124,58,237,0.45) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 45% 65%, rgba(0,212,255,0.38) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 85% 55%, rgba(0,255,136,0.3) 0%, transparent 100%)',
    ],
    grid: 'rgba(0,212,255,0.028)',
    nebula: 'radial-gradient(ellipse at 35% 50%, rgba(0,60,200,0.08) 0%, transparent 55%), radial-gradient(ellipse at 65% 50%, rgba(124,58,237,0.07) 0%, transparent 50%)',
    scanAlpha: 0.04,
  },
  cyberpunk: {
    stars: [
      'radial-gradient(1px 1px at 10% 20%, rgba(255,0,255,0.7) 0%, transparent 100%)',
      'radial-gradient(1.5px 1.5px at 80% 10%, rgba(255,102,0,0.6) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 30% 70%, rgba(255,0,255,0.5) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 90% 60%, rgba(0,255,170,0.4) 0%, transparent 100%)',
      'radial-gradient(2px 2px at 55% 35%, rgba(255,0,255,0.35) 0%, transparent 100%)',
    ],
    grid: 'rgba(255,0,255,0.035)',
    nebula: 'radial-gradient(ellipse at 20% 40%, rgba(200,0,200,0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 60%, rgba(255,80,0,0.08) 0%, transparent 50%)',
    scanAlpha: 0.06,
  },
  matrix: {
    stars: [
      'radial-gradient(1px 1px at 12% 18%, rgba(0,255,65,0.65) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 67% 8%, rgba(0,255,65,0.5) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 44% 72%, rgba(0,255,65,0.4) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 88% 50%, rgba(57,255,20,0.45) 0%, transparent 100%)',
    ],
    grid: 'rgba(0,255,65,0.035)',
    nebula: 'radial-gradient(ellipse at 50% 50%, rgba(0,100,20,0.12) 0%, transparent 60%)',
    scanAlpha: 0.07,
  },
  aurora: {
    stars: [
      'radial-gradient(1px 1px at 20% 30%, rgba(127,255,212,0.6) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 70% 20%, rgba(147,112,219,0.55) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 50% 75%, rgba(0,206,209,0.45) 0%, transparent 100%)',
      'radial-gradient(1.5px 1.5px at 85% 45%, rgba(127,255,212,0.4) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 35% 55%, rgba(152,255,152,0.35) 0%, transparent 100%)',
    ],
    grid: 'rgba(127,255,212,0.025)',
    nebula: 'radial-gradient(ellipse at 30% 40%, rgba(0,150,200,0.1) 0%, transparent 55%), radial-gradient(ellipse at 70% 55%, rgba(147,112,219,0.1) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(0,206,209,0.07) 0%, transparent 40%)',
    scanAlpha: 0.03,
  },
  midnight: {
    stars: [
      'radial-gradient(1px 1px at 15% 20%, rgba(108,142,255,0.6) 0%, transparent 100%)',
      'radial-gradient(1.5px 1.5px at 80% 15%, rgba(167,139,250,0.55) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 45% 68%, rgba(108,142,255,0.45) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 90% 55%, rgba(167,139,250,0.4) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 60% 35%, rgba(108,142,255,0.3) 0%, transparent 100%)',
    ],
    grid: 'rgba(108,142,255,0.025)',
    nebula: 'radial-gradient(ellipse at 25% 40%, rgba(60,80,200,0.1) 0%, transparent 60%), radial-gradient(ellipse at 75% 55%, rgba(120,80,200,0.08) 0%, transparent 50%)',
    scanAlpha: 0.04,
  },
  sunset: {
    stars: [
      'radial-gradient(1.5px 1.5px at 15% 25%, rgba(255,140,66,0.65) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 75% 15%, rgba(255,20,147,0.5) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 50% 70%, rgba(255,69,0,0.5) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 88% 50%, rgba(255,215,0,0.4) 0%, transparent 100%)',
    ],
    grid: 'rgba(255,140,66,0.028)',
    nebula: 'radial-gradient(ellipse at 30% 50%, rgba(180,60,0,0.12) 0%, transparent 55%), radial-gradient(ellipse at 70% 40%, rgba(255,20,100,0.08) 0%, transparent 50%)',
    scanAlpha: 0.05,
  },
  white: {
    stars: [
      'radial-gradient(1px 1px at 20% 25%, rgba(0,100,200,0.25) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 75% 15%, rgba(100,50,200,0.2) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 45% 65%, rgba(0,100,200,0.18) 0%, transparent 100%)',
    ],
    grid: 'rgba(0,100,200,0.04)',
    nebula: 'radial-gradient(ellipse at 35% 50%, rgba(200,220,255,0.5) 0%, transparent 55%), radial-gradient(ellipse at 65% 50%, rgba(200,180,255,0.3) 0%, transparent 50%)',
    scanAlpha: 0.02,
  },
  arc: {
    stars: [
      'radial-gradient(1.5px 1.5px at 15% 25%, rgba(255,107,53,0.65) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 75% 15%, rgba(198,40,40,0.55) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 45% 65%, rgba(255,107,53,0.45) 0%, transparent 100%)',
      'radial-gradient(1px 1px at 85% 55%, rgba(255,235,59,0.35) 0%, transparent 100%)',
    ],
    grid: 'rgba(255,107,53,0.028)',
    nebula: 'radial-gradient(ellipse at 35% 50%, rgba(150,50,0,0.1) 0%, transparent 55%), radial-gradient(ellipse at 65% 50%, rgba(180,0,0,0.07) 0%, transparent 50%)',
    scanAlpha: 0.05,
  },
}

const DEFAULT_BG = BG_CONFIGS.dark

export default function Background() {
  const { themeId } = useTheme()
  const cfg = BG_CONFIGS[themeId] || DEFAULT_BG
  const isLight = themeId === 'white'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden',
      background: 'var(--bg)', transition: 'background 0.5s ease'
    }}>
      {/* Stars / particles layer */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: cfg.stars.join(','),
        backgroundSize: '300px 200px, 200px 300px, 250px 250px, 150px 350px, 400px 400px',
        animation: 'starshift 60s linear infinite',
        opacity: isLight ? 0.4 : 1,
        transition: 'opacity 0.5s',
      }}/>

      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${cfg.grid} 1px, transparent 1px), linear-gradient(90deg, ${cfg.grid} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        animation: 'gridscroll 28s linear infinite',
        opacity: isLight ? 0.6 : 1,
      }}/>

      {/* Nebula / ambient glow */}
      <div style={{
        position: 'absolute',
        width: '900px', height: '900px',
        top: '50%', left: '50%',
        background: cfg.nebula,
        animation: 'glowbreath 7s ease-in-out infinite',
        transform: 'translate(-50%,-50%)',
        transition: 'background 0.5s ease',
      }}/>

      {/* Vignette */}
      {!isLight && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}/>
      )}

      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${cfg.scanAlpha}) 2px, rgba(0,0,0,${cfg.scanAlpha}) 4px)`,
        transition: 'background 0.4s',
      }}/>

      {/* Matrix theme — rain column effect overlay */}
      {themeId === 'matrix' && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(180deg, transparent 0px, transparent 14px, rgba(0,255,65,0.025) 14px, rgba(0,255,65,0.025) 28px)',
          animation: 'gridscroll 4s linear infinite',
        }}/>
      )}

      {/* Cyberpunk theme — diagonal stripe overlay */}
      {themeId === 'cyberpunk' && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(-55deg, transparent, transparent 40px, rgba(255,0,255,0.015) 40px, rgba(255,0,255,0.015) 42px)',
        }}/>
      )}
    </div>
  )
}
