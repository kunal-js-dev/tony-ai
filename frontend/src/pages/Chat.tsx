import { useEffect, useState } from 'react';
import ChatPanel from '@/components/ChatPanel';
import { listFiles } from '@/api/client';
import type { DocFile } from '@/types';
import { formatBytes } from '@/utils/format';

export default function Chat() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | undefined>();

  useEffect(() => {
    listFiles({ limit: 100 })
      .then((res) => {
        const processed = res.files.filter((f) => f.status === 'processed');
        setFiles(processed.length > 0 ? processed : res.files);
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(files.map((f) => f.id)));
  };

  const clearAll = () => setSelected(new Set());

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl gap-4">
      <div className="panel flex w-72 shrink-0 flex-col">
        <div className="panel-header">
          <h3 className="font-mono text-sm text-cyber-accent">Documents</h3>
          <span className="font-mono text-[10px] text-cyber-muted">
            {selected.size} selected
          </span>
        </div>

        <div className="flex gap-2 border-b border-cyber-border px-3 py-2">
          <button type="button" className="btn-ghost text-xs" onClick={selectAll}>
            All
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={clearAll}>
            None
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-4 text-xs text-cyber-muted">Loading files…</p>
          ) : files.length === 0 ? (
            <p className="p-4 text-xs text-cyber-muted">
              No indexed documents. Upload and analyze files first.
            </p>
          ) : (
            files.map((file) => (
              <label
                key={file.id}
                className={[
                  'flex cursor-pointer items-start gap-2 border-b border-cyber-border/50 px-3 py-2.5 transition-colors hover:bg-cyber-bg/30',
                  selected.has(file.id) ? 'bg-cyber-accent/5' : '',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={selected.has(file.id)}
                  onChange={() => toggle(file.id)}
                  className="mt-0.5 accent-cyan-400"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-cyber-text">
                    {file.original_name}
                  </p>
                  <p className="font-mono text-[10px] text-cyber-muted">
                    {file.file_type} · {formatBytes(file.filesize)}
                  </p>
                </div>
              </label>
            ))
          )}
        </div>

        {sessionId && (
          <div className="border-t border-cyber-border px-3 py-2">
            <p className="font-mono text-[10px] text-cyber-muted">Session</p>
            <p className="truncate font-mono text-[10px] text-cyber-accent">{sessionId}</p>
          </div>
        )}
      </div>

      <div className="flex-1">
        <ChatPanel
          fileIds={selected.size > 0 ? Array.from(selected) : undefined}
          sessionId={sessionId}
          onSessionChange={setSessionId}
          emptyMessage={
            selected.size > 0
              ? `Chat across ${selected.size} selected document(s). All answers grounded in local context.`
              : 'Select documents to scope the chat, or ask general questions across all indexed files.'
          }
        />
      </div>
    </div>
  );
}
