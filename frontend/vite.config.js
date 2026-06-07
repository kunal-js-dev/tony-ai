import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // ── Flask-only routes (port 5000) ────────────────────────────────────
      '/api/system': { target: 'http://localhost:5000', changeOrigin: true },
      '/api/ollama_status': { target: 'http://localhost:5000', changeOrigin: true },
      '/api/launch': { target: 'http://localhost:5000', changeOrigin: true },
      '/api/action': { target: 'http://localhost:5000', changeOrigin: true },
      '/api/db': { target: 'http://localhost:5000', changeOrigin: true },

      // ── FastAPI document-intelligence routes (port 8000) ─────────────────
      // Specific paths MUST come before the catch-all '/api' rule.
      '/api/health':   { target: 'http://localhost:8000', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
      '/api/stats':    { target: 'http://localhost:8000', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
      '/api/upload':   { target: 'http://localhost:8000', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
      '/api/files':    { target: 'http://localhost:8000', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
      '/api/file':     { target: 'http://localhost:8000', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
      '/api/analyze':  { target: 'http://localhost:8000', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
      '/api/chat':     { target: 'http://localhost:8000', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
      '/api/sessions': { target: 'http://localhost:8000', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
      '/api/settings': { target: 'http://localhost:8000', changeOrigin: true, rewrite: p => p.replace(/^\/api/, '') },
    },
  },
});
