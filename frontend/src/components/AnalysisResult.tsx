import type { AnalysisResult as AnalysisResultType } from '@/types';

interface AnalysisResultProps {
  result: AnalysisResultType | null;
  loading?: boolean;
  error?: string | null;
}

function MetaItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-cyber-border bg-cyber-bg/40 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-cyber-muted">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-cyber-accent">{value}</p>
    </div>
  );
}

export default function AnalysisResult({ result, loading, error }: AnalysisResultProps) {
  if (loading) {
    return (
      <div className="panel p-8 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-cyber-border border-t-cyber-accent" />
        <p className="font-mono text-sm text-cyber-accent animate-scan">
          Analyzing document locally…
        </p>
        <p className="mt-2 text-xs text-cyber-muted">
          Extracting text, chunking, and embedding via Ollama
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel border-cyber-danger/30 p-6">
        <p className="font-mono text-sm text-cyber-danger">Analysis failed</p>
        <p className="mt-2 text-sm text-cyber-muted">{error}</p>
      </div>
    );
  }

  if (!result) return null;

  const metadataEntries = Object.entries(result.metadata ?? {}).filter(
    ([, v]) => v != null && v !== '',
  );

  return (
    <div className="panel overflow-hidden">
      <div className="panel-header">
        <h3 className="font-mono text-sm text-cyber-accent">Analysis Result</h3>
        <span className="badge border-cyber-success/30 bg-cyber-success/10 text-cyber-success">
          PROCESSED
        </span>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h4 className="text-lg font-semibold text-cyber-text">{result.title}</h4>
          {result.summary && (
            <p className="mt-2 text-sm leading-relaxed text-cyber-muted">{result.summary}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetaItem label="Pages" value={result.page_count} />
          <MetaItem label="Words" value={result.word_count.toLocaleString()} />
          <MetaItem label="Chunks" value={result.rag.chunks} />
          <MetaItem label="Embeddings" value={result.rag.embeddings} />
        </div>

        {metadataEntries.length > 0 && (
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-cyber-muted">
              Metadata
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {metadataEntries.map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between rounded border border-cyber-border bg-cyber-bg/30 px-3 py-1.5"
                >
                  <span className="font-mono text-xs text-cyber-muted">{key}</span>
                  <span className="font-mono text-xs text-cyber-text">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.content_preview && (
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-cyber-muted">
              Content Preview
            </p>
            <pre className="max-h-64 overflow-y-auto rounded border border-cyber-border bg-cyber-bg/60 p-3 font-mono text-xs leading-relaxed text-cyber-text/80">
              {result.content_preview}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
