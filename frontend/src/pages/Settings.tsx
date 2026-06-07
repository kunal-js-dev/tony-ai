import { useEffect, useState } from 'react';
import { getHealth, getSettings, updateSettings } from '@/api/client';
import type { AppSettings, HealthResponse } from '@/types';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSettings(), getHealth()])
      .then(([s, h]) => {
        setSettings(s);
        setHealth(h);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      });
  }, []);

  const handleChange = (key: keyof AppSettings, value: string | number) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      setMessage('Settings saved locally.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!settings && !error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyber-border border-t-cyber-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-mono text-xl font-bold tracking-wide text-cyber-accent">
          Settings
        </h2>
        <p className="mt-1 text-sm text-cyber-muted">
          Configure Ollama models and RAG parameters — stored in local SQLite
        </p>
      </div>

      {error && (
        <div className="panel border-cyber-danger/30 p-4">
          <p className="text-sm text-cyber-danger">{error}</p>
        </div>
      )}

      {message && (
        <div className="panel border-cyber-success/30 p-4">
          <p className="text-sm text-cyber-success">{message}</p>
        </div>
      )}

      <div className="panel p-6 space-y-5">
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-cyber-muted">
            Chat Model (Ollama)
          </label>
          <input
            className="input-field"
            value={settings?.chat_model ?? ''}
            onChange={(e) => handleChange('chat_model', e.target.value)}
            placeholder="llama3.2"
            list="chat-models"
          />
          <datalist id="chat-models">
            {health?.ollama_models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <p className="mt-1 text-[10px] text-cyber-muted/60">
            Run: ollama pull llama3.2
          </p>
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-cyber-muted">
            Embedding Model (Ollama)
          </label>
          <input
            className="input-field"
            value={settings?.embed_model ?? ''}
            onChange={(e) => handleChange('embed_model', e.target.value)}
            placeholder="nomic-embed-text"
            list="embed-models"
          />
          <datalist id="embed-models">
            {health?.ollama_models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <p className="mt-1 text-[10px] text-cyber-muted/60">
            Run: ollama pull nomic-embed-text
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-cyber-muted">
              Chunk Size
            </label>
            <input
              type="number"
              className="input-field"
              value={settings?.chunk_size ?? 800}
              onChange={(e) => handleChange('chunk_size', Number(e.target.value))}
              min={100}
              max={4000}
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-cyber-muted">
              Chunk Overlap
            </label>
            <input
              type="number"
              className="input-field"
              value={settings?.chunk_overlap ?? 120}
              onChange={(e) => handleChange('chunk_overlap', Number(e.target.value))}
              min={0}
              max={500}
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-cyber-muted">
              RAG Top-K
            </label>
            <input
              type="number"
              className="input-field"
              value={settings?.rag_top_k ?? 5}
              onChange={(e) => handleChange('rag_top_k', Number(e.target.value))}
              min={1}
              max={20}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-cyber-muted">
            System Prompt
          </label>
          <textarea
            className="input-field min-h-[120px] resize-y font-mono text-xs"
            value={settings?.system_prompt ?? ''}
            onChange={(e) => handleChange('system_prompt', e.target.value)}
            placeholder="Custom system prompt for the AI assistant…"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !settings}
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="panel p-4">
        <h3 className="mb-3 font-mono text-sm text-cyber-accent">Offline Status</h3>
        <div className="grid gap-2 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-cyber-muted">Network</span>
            <span className="text-cyber-success">Not required</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyber-muted">Ollama</span>
            <span className={health?.ollama_available ? 'text-cyber-success' : 'text-cyber-warning'}>
              {health?.ollama_available ? 'Running' : 'Not detected'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-cyber-muted">Data storage</span>
            <span className="text-cyber-text">Local SQLite + ChromaDB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
