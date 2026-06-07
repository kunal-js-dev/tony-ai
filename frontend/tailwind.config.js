/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg:       'var(--color-bg)',
          surface:  'var(--color-surface)',
          raised:   'var(--color-surface-raised)',
          border:   'var(--color-border)',
          muted:    'var(--color-muted)',
          text:     'var(--color-text)',
          accent:   'var(--color-accent)',
          dim:      'var(--color-accent-dim)',
          danger:   'var(--color-danger)',
          success:  'var(--color-success)',
          warning:  'var(--color-warning)',
          purple:   'var(--color-purple)',
          orange:   'var(--color-orange)',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan':       'scan 2s linear infinite',
        'fade-in':    'fadeIn 0.3s ease forwards',
        'slide-up':   'slideUp 0.3s ease forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'spin-slow':  'spin 4s linear infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0, 212, 255, 0.15)' },
          '50%':      { boxShadow: '0 0 20px rgba(0, 212, 255, 0.25)' },
        },
      },
      boxShadow: {
        'glow':    '0 0 20px rgba(0, 212, 255, 0.25)',
        'glow-sm': '0 0 8px rgba(0, 212, 255, 0.15)',
        'glow-lg': '0 0 40px rgba(0, 212, 255, 0.25)',
        'glow-danger': '0 0 12px rgba(255, 68, 102, 0.25)',
        'glow-success': '0 0 12px rgba(0, 230, 118, 0.25)',
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}
