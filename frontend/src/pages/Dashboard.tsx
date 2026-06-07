import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteFile, getHealth, getStats, listFiles } from '@/api/client';
import type { DocFile, HealthResponse, StatsResponse } from '@/types';
import { formatBytes, formatDate, formatUptime } from '@/utils/format';

function FileTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    pdf: '📄', excel: '📊', ppt: '📑', doc: '📝', image: '🖼', ocr: '🔍', other: '📁',
  };
  return <span>{icons[type] ?? icons.other}</span>;
}

function StatCard({
  label, value, sub, accent = false,
}: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="stat-card group">
      <p className="font-mono text-[10px] uppercase tracking-widest text-cyber-muted">
        {label}
      </p>
      <p className={`mt-2 font-mono text-3xl font-bold tracking-tight ${accent ? 'text-cyber-accent text-glow' : 'text-cyber-text'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 font-mono text-[10px] text-cyber-muted/60">{sub}</p>}
    </div>
  );
}

const QUICK_ACTIONS = [
  { to: '/upload',        label: 'Upload File',    icon: '↑', desc: 'Add new document' },
  { to: '/analyze/pdf',   label: 'Analyze PDF',    icon: '▤', desc: 'Extract & summarize' },
  { to: '/analyze/excel', label: 'Excel Analysis', icon: '▦', desc: 'Stats & trends' },
  { to: '/chat',          label: 'RAG Chat',       icon: '◉', desc: 'Ask your documents' },
  { to: '/analyze/ppt',   label: 'PPT Analyzer',   icon: '▧', desc: 'Presentation notes' },
  { to: '/analyze/ocr',   label: 'OCR Scanner',    icon: '◎', desc: 'Read image text' },
];

export default function Dashboard() {
  const [health, setHealth]   = useState<HealthResponse | null>(null);
  const [stats, setStats]     = useState<StatsResponse | null>(null);
  const [files, setFiles]     = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, s, f] = await Promise.all([getHealth(), getStats(), listFiles({ limit: 8 })]);
      setHealth(h);
      setStats(s);
      setFiles(f.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this file and all its data?')) return;
    try {
      await deleteFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-2xl font-bold tracking-wide text-cyber-accent text-glow">
            Dashboard
          </h2>
          <p className="mt-1 text-sm text-cyber-muted">
            System overview — all processing runs locally on your machine
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={load}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border border-cyber-muted border-t-cyber-accent" />
              Loading…
            </span>
          ) : 'Refresh'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="panel border-cyber-danger/30 p-4 animate-fade-in">
          <p className="text-sm text-cyber-danger">{error}</p>
          <p className="mt-1 font-mono text-xs text-cyber-muted">
            Ensure the FastAPI backend is running on port 8000.
            Run: <code className="text-cyber-accent">cd backend && python -m uvicorn main:app --port 8000</code>
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Files"
          value={loading ? '…' : (stats?.total_files ?? '—')}
          sub="Uploaded documents"
          accent
        />
        <StatCard
          label="Documents"
          value={loading ? '…' : (stats?.total_documents ?? '—')}
          sub="Processed content"
        />
        <StatCard
          label="RAG Chunks"
          value={loading ? '…' : (stats?.total_chunks ?? health?.chromadb_chunks ?? '—')}
          sub="Vector database"
        />
        <StatCard
          label="Storage"
          value={loading ? '…' : (stats ? formatBytes(stats.storage_bytes) : '—')}
          sub="Local disk usage"
        />
      </div>

      {/* Status + Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* System Status */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="font-mono text-sm text-cyber-accent">System Status</h3>
            {health && (
              <span
                className={
                  health.status === 'ok'
                    ? 'badge badge-online'
                    : health.status === 'degraded'
                      ? 'badge badge-degraded'
                      : 'badge badge-offline'
                }
              >
                {health.status.toUpperCase()}
              </span>
            )}
          </div>
          <div className="space-y-0 p-4">
            {[
              {
                label: 'Backend API',
                value: health ? 'Connected' : 'Disconnected',
                ok: !!health,
              },
              {
                label: 'Ollama LLM',
                value: health?.ollama_available ? 'Running' : 'Offline',
                ok: health?.ollama_available ?? false,
                warn: !health?.ollama_available && !!health,
              },
              {
                label: 'SQLite Database',
                value: health?.database_ok ? 'Healthy' : 'Error',
                ok: health?.database_ok ?? false,
              },
              {
                label: 'ChromaDB Vectors',
                value: String(health?.chromadb_chunks?.toLocaleString() ?? '—') + ' chunks',
                ok: true,
              },
              {
                label: 'Uptime',
                value: formatUptime(health?.uptime_seconds),
                ok: true,
              },
            ].map(({ label, value, ok, warn }) => (
              <div key={label} className="flex items-center justify-between border-b border-cyber-border/50 py-2.5 last:border-0">
                <span className="font-mono text-xs text-cyber-muted">{label}</span>
                <span
                  className={`font-mono text-xs ${
                    warn
                      ? 'text-cyber-warning'
                      : ok
                        ? 'text-cyber-success'
                        : 'text-cyber-danger'
                  }`}
                >
                  {value}
                </span>
              </div>
            ))}

            {health?.ollama_models && health.ollama_models.length > 0 && (
              <div className="mt-3 border-t border-cyber-border/50 pt-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-cyber-muted/60">
                  Available Models
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {health.ollama_models.slice(0, 8).map((m) => (
                    <span
                      key={m}
                      className="chip text-cyber-accent/80"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!health?.ollama_available && (
              <div className="mt-3 rounded-lg border border-cyber-warning/20 bg-cyber-warning/5 p-3">
                <p className="font-mono text-[10px] text-cyber-warning">
                  ⚠ Ollama not running — AI features unavailable
                </p>
                <p className="mt-1 font-mono text-[10px] text-cyber-muted">
                  Run: <span className="text-cyber-accent">ollama serve</span>
                  {' '}then:{' '}
                  <span className="text-cyber-accent">ollama pull llama3.2</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="panel">
          <div className="panel-header">
            <h3 className="font-mono text-sm text-cyber-accent">Quick Actions</h3>
            {stats && (
              <span className="font-mono text-[10px] text-cyber-muted">
                {stats.total_sessions} sessions · {stats.total_messages} messages
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-start gap-3 rounded-lg border border-cyber-border bg-cyber-bg/50 px-3 py-3 transition-all hover:border-cyber-accent/35 hover:bg-cyber-accent/5 hover:shadow-glow-sm"
              >
                <span className="mt-0.5 font-mono text-base text-cyber-accent/80 group-hover:text-cyber-accent">
                  {action.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-cyber-text group-hover:text-cyber-accent transition-colors">
                    {action.label}
                  </p>
                  <p className="font-mono text-[10px] text-cyber-muted/70">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Files */}
      <div className="panel">
        <div className="panel-header">
          <h3 className="font-mono text-sm text-cyber-accent">Recent Files</h3>
          <Link to="/upload" className="btn-ghost text-xs text-cyber-accent">
            + Upload
          </Link>
        </div>

        {loading && files.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-cyber-border border-t-cyber-accent" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="text-4xl opacity-20">📁</div>
            <p className="text-sm text-cyber-muted">No files uploaded yet.</p>
            <Link to="/upload" className="btn-primary text-xs">
              Upload your first document
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-cyber-border/50">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-cyber-bg/40"
              >
                <div className="flex items-center gap-3">
                  <FileTypeIcon type={file.file_type} />
                  <div>
                    <p className="text-sm font-medium text-cyber-text">{file.original_name}</p>
                    <p className="font-mono text-[10px] text-cyber-muted">
                      {file.file_type} · {formatBytes(file.filesize)} · {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'badge text-[10px]',
                      file.status === 'processed'
                        ? 'border-cyber-success/30 text-cyber-success'
                        : file.status === 'error'
                          ? 'border-cyber-danger/30 text-cyber-danger'
                          : 'border-cyber-border text-cyber-muted',
                    ].join(' ')}
                  >
                    {file.status}
                  </span>
                  <Link
                    to={`/analyze/${file.file_type === 'image' ? 'ocr' : file.file_type}`}
                    className="btn-ghost text-xs text-cyber-accent"
                  >
                    Analyze →
                  </Link>
                  <button
                    type="button"
                    className="btn-ghost text-xs text-cyber-danger"
                    onClick={() => handleDelete(file.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
