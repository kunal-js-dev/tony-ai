import { useCallback, useEffect, useRef, useState } from 'react';
import { streamChat } from '@/api/client';
import type { ChatMessage, ContextChunk } from '@/types';

interface ChatPanelProps {
  fileIds?: number[];
  sessionId?: string;
  onSessionChange?: (sessionId: string) => void;
  placeholder?: string;
  emptyMessage?: string;
}

function formatTime(iso?: string): string {
  if (!iso) return new Date().toLocaleTimeString();
  return new Date(iso).toLocaleTimeString();
}

export default function ChatPanel({
  fileIds,
  sessionId: externalSessionId,
  onSessionChange,
  placeholder = 'Ask about your documents…',
  emptyMessage = 'Start a conversation with your indexed documents.',
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState(externalSessionId);
  const [contexts, setContexts] = useState<ContextChunk[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (externalSessionId) setSessionId(externalSessionId);
  }, [externalSessionId]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantPlaceholder: ChatMessage = {
      role: 'assistant',
      content: '',
      source: 'ollama',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    setStreaming(true);
    abortRef.current = new AbortController();

    try {
      await streamChat(
        {
          message: text,
          session_id: sessionId,
          file_ids: fileIds?.length ? fileIds : undefined,
          stream: true,
        },
        (chunk) => {
          if (chunk.type === 'token' && chunk.content) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + chunk.content,
                };
              }
              return updated;
            });
          }

          if (chunk.type === 'done') {
            if (chunk.session_id) {
              setSessionId(chunk.session_id);
              onSessionChange?.(chunk.session_id);
            }
            if (chunk.contexts) setContexts(chunk.contexts);
            if (chunk.source) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, source: chunk.source };
                }
                return updated;
              });
            }
          }

          if (chunk.type === 'error') {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: chunk.error ?? 'An error occurred.',
                  source: 'error',
                };
              }
              return updated;
            });
          }
        },
        abortRef.current.signal,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reach backend';
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            content: `Error: ${msg}. Ensure the backend is running on port 8000 or 5000.`,
            source: 'error',
          };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, sessionId, fileIds, onSessionChange]);

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div className="panel flex h-full min-h-[480px] flex-col">
      <div className="panel-header">
        <h3 className="font-mono text-sm text-cyber-accent">RAG Chat</h3>
        <div className="flex items-center gap-2">
          {fileIds && fileIds.length > 0 && (
            <span className="badge border-cyber-accent/30 bg-cyber-accent/5 text-cyber-accent">
              {fileIds.length} doc{fileIds.length > 1 ? 's' : ''}
            </span>
          )}
          {streaming && (
            <span className="badge border-cyber-accent/30 text-cyber-accent animate-scan">
              STREAMING
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="max-w-sm text-center text-sm text-cyber-muted">{emptyMessage}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={[
                'max-w-[80%] rounded-lg px-4 py-2.5 text-sm',
                msg.role === 'user'
                  ? 'border border-cyber-accent/20 bg-cyber-accent/10 text-cyber-text'
                  : 'border border-cyber-border bg-cyber-bg/60 text-cyber-text',
              ].join(' ')}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-cyber-muted">
                  {msg.role === 'user' ? 'You' : 'AI'}
                </span>
                {msg.source && msg.role === 'assistant' && (
                  <span className="font-mono text-[10px] text-cyber-accent/60">
                    {msg.source}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">
                {msg.content}
                {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-cyber-accent" />
                )}
              </p>
              <p className="mt-1 font-mono text-[10px] text-cyber-muted/50">
                {formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {contexts.length > 0 && (
        <div className="border-t border-cyber-border px-4 py-2">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-cyber-muted">
            Retrieved Context ({contexts.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {contexts.map((ctx, i) => (
              <div
                key={i}
                className="shrink-0 max-w-[200px] rounded border border-cyber-border bg-cyber-bg/40 px-2 py-1"
              >
                <p className="truncate font-mono text-[10px] text-cyber-accent">
                  score: {ctx.score.toFixed(2)}
                </p>
                <p className="line-clamp-2 text-[10px] text-cyber-muted">{ctx.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-cyber-border p-4">
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={placeholder}
            disabled={streaming}
          />
          {streaming ? (
            <button type="button" className="btn-ghost text-cyber-danger" onClick={stop}>
              Stop
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={send}
              disabled={!input.trim()}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
