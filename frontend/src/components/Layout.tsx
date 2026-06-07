import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { getHealth } from '@/api/client';
import type { HealthResponse } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',             label: 'Dashboard',    icon: '◈', section: 'Main' },
  { to: '/upload',       label: 'Upload Files', icon: '↑' },
  { to: '/analyze/pdf',  label: 'PDF Analyzer', icon: '▤', section: 'Analyzers' },
  { to: '/analyze/excel',label: 'Excel Analyzer',icon: '▦' },
  { to: '/analyze/ppt',  label: 'PPT Analyzer', icon: '▧' },
  { to: '/analyze/doc',  label: 'Doc Analyzer', icon: '▨' },
  { to: '/analyze/ocr',  label: 'OCR Analyzer', icon: '◎' },
  { to: '/chat',         label: 'RAG Chat',     icon: '◉', section: 'AI' },
  { to: '/settings',     label: 'Settings',     icon: '⚙', section: 'System' },
];

function StatusDot({ health }: { health: HealthResponse | null }) {
  if (!health) {
    return (
      <span className="flex items-center gap-1.5 badge badge-offline animate-pulse-slow">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        CONNECTING
      </span>
    );
  }
  if (health.status === 'ok' && health.ollama_available) {
    return (
      <span className="flex items-center gap-1.5 badge badge-online">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        OFFLINE READY
      </span>
    );
  }
  if (health.status === 'degraded' || !health.ollama_available) {
    return (
      <span className="flex items-center gap-1.5 badge badge-degraded">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        DEGRADED
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 badge badge-offline">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      OFFLINE
    </span>
  );
}

export default function Layout() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const data = await getHealth();
        if (active) setHealth(data);
      } catch {
        if (active) setHealth(null);
      }
    };
    poll();
    const id = setInterval(poll, 15_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  let lastSection = '';

  return (
    <div className="flex h-screen overflow-hidden bg-cyber-bg">
      {/* Sidebar */}
      <aside className="flex w-62 shrink-0 flex-col border-r border-cyber-border bg-cyber-surface/95 backdrop-blur-md" style={{ width: '15.5rem' }}>
        {/* Logo */}
        <div className="border-b border-cyber-border px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-cyber-accent/30 bg-cyber-accent/10 font-mono text-sm font-bold text-cyber-accent shadow-glow-sm">
              DA
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse-slow rounded-full bg-cyber-accent shadow-glow-sm" />
            </div>
            <div>
              <h1 className="font-mono text-sm font-bold tracking-widest text-cyber-accent">
                DOC ANALYZER
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-cyber-muted/70">
                100% Local · No Cloud
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV_ITEMS.map((item) => {
            const showSection = item.section && item.section !== lastSection;
            if (item.section) lastSection = item.section;

            return (
              <div key={item.to}>
                {showSection && (
                  <p className="mb-1 mt-4 px-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-cyber-muted/50 first:mt-1">
                    {item.section}
                  </p>
                )}
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    isActive ? 'nav-link-active mb-0.5 block' : 'nav-link mb-0.5 block'
                  }
                >
                  <span className="w-4 text-center font-mono text-cyber-accent/70 text-xs">
                    {item.icon}
                  </span>
                  {item.label}
                </NavLink>
              </div>
            );
          })}
        </nav>

        {/* Footer status */}
        <div className="border-t border-cyber-border px-4 py-4">
          <StatusDot health={health} />
          {health && (
            <div className="mt-2.5 space-y-1 font-mono text-[10px] text-cyber-muted">
              <div className="flex justify-between">
                <span>Ollama</span>
                <span className={health.ollama_available ? 'text-cyber-success' : 'text-cyber-warning'}>
                  {health.ollama_available ? '● online' : '○ offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Chunks</span>
                <span className="text-cyber-text">{health.chromadb_chunks.toLocaleString()}</span>
              </div>
              {health.ollama_models.length > 0 && (
                <div className="flex justify-between">
                  <span>Model</span>
                  <span className="truncate max-w-[100px] text-right text-cyber-accent/80">
                    {health.ollama_models[0]}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>v{health.version}</span>
                <span>FastAPI</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-cyber-border bg-cyber-surface/60 px-6 backdrop-blur-sm">
          <p className="font-mono text-xs text-cyber-muted">
            <span className="text-cyber-accent">▸</span>{' '}
            Offline AI Document Analysis System
          </p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[10px] text-cyber-muted/50">
              localhost:8000
            </span>
            <span className="h-1.5 w-1.5 animate-pulse-slow rounded-full bg-cyber-accent shadow-glow-sm" />
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
