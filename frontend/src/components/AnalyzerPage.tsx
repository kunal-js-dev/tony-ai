import { useState } from 'react';
import FileDropzone from '@/components/FileDropzone';

interface AnalyzerPageProps {
  title: string;
  description: string;
  accept: string;
  acceptLabel: string;
  icon?: string;
  color?: string;
  analyze: (file: File) => Promise<Record<string, unknown>>;
}

function ResultSection({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        className="panel-header w-full text-left hover:bg-cyber-bg/20 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-mono text-xs text-cyber-accent">{label}</span>
        <span className="font-mono text-[10px] text-cyber-muted">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function MetaGrid({ data }: { data: Record<string, string | number | undefined> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined && v !== '');
  if (!entries.length) return null;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
      {entries.map(([k, v]) => (
        <div key={k}>
          <p className="font-mono text-[10px] uppercase tracking-wider text-cyber-muted">{k.replace(/_/g, ' ')}</p>
          <p className="mt-0.5 font-mono text-sm text-cyber-text">{String(v)}</p>
        </div>
      ))}
    </div>
  );
}

function TextPreview({ text, maxLength = 3000 }: { text: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  const truncated = text.length > maxLength && !expanded;
  const displayed = truncated ? text.slice(0, maxLength) : text;
  return (
    <div>
      <pre className="code-block text-[11px] leading-relaxed">{displayed}{truncated ? '…' : ''}</pre>
      {text.length > maxLength && (
        <button
          type="button"
          className="mt-2 btn-ghost text-xs text-cyber-accent"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Show less' : `Show all (${text.length.toLocaleString()} chars)`}
        </button>
      )}
    </div>
  );
}

function TablePreview({ table }: { table: { page_number: number; rows: string[][] } }) {
  if (!table.rows?.length) return null;
  const headers = table.rows[0];
  const body = table.rows.slice(1);
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 font-mono text-[10px] text-cyber-muted">Page {table.page_number}</p>
      <table className="w-full border-collapse font-mono text-[11px]">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="border border-cyber-border bg-cyber-surface px-3 py-1.5 text-left text-cyber-accent font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.slice(0, 20).map((row, ri) => (
            <tr key={ri} className="hover:bg-cyber-bg/30">
              {row.map((cell, ci) => (
                <td key={ci} className="border border-cyber-border/50 px-3 py-1.5 text-cyber-text">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {body.length > 20 && (
            <tr>
              <td colSpan={headers.length} className="border border-cyber-border/50 px-3 py-1.5 text-center text-cyber-muted text-[10px]">
                …{body.length - 20} more rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function AnalysisResults({ result }: { result: Record<string, unknown> }) {
  const pages = result.pages as Array<{ page_number: number; text: string }> | undefined;
  const tables = result.tables as Array<{ page_number: number; rows: string[][] }> | undefined;
  const sheets = result.sheets as Array<{ sheet_name: string; rows: number; columns: number; column_names: string[] }> | undefined;
  const slides = result.slides as Array<{ slide_number: number; title?: string; text?: string }> | undefined;
  const summary = result.summary as Record<string, unknown> | undefined;
  const text = result.text as string | undefined;

  const metaFields: Record<string, string | number | undefined> = {};
  if (result.page_count != null) metaFields['Pages'] = result.page_count as number;
  if (result.word_count != null) metaFields['Words'] = result.word_count as number;
  if (result.slide_count != null) metaFields['Slides'] = result.slide_count as number;
  if (result.sheet_count != null) metaFields['Sheets'] = result.sheet_count as number;
  if (result.row_count != null) metaFields['Rows'] = result.row_count as number;
  if (result.title) metaFields['Title'] = result.title as string;
  if (result.type) metaFields['Type'] = result.type as string;
  if (result.language) metaFields['Language'] = result.language as string;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary badges */}
      {Object.keys(metaFields).length > 0 && (
        <ResultSection label="DOCUMENT METADATA">
          <MetaGrid data={metaFields} />
        </ResultSection>
      )}

      {/* AI summary if available */}
      {summary && typeof summary === 'object' && Object.keys(summary).length > 0 && (
        <ResultSection label="EXTRACTION SUMMARY">
          <MetaGrid data={Object.fromEntries(
            Object.entries(summary).map(([k, v]) => [k, String(v)])
          )} />
        </ResultSection>
      )}

      {/* Tables */}
      {tables && tables.length > 0 && (
        <ResultSection label={`TABLES (${tables.length} found)`}>
          <div className="space-y-4">
            {tables.slice(0, 5).map((t, i) => (
              <TablePreview key={i} table={t} />
            ))}
            {tables.length > 5 && (
              <p className="font-mono text-[10px] text-cyber-muted">…{tables.length - 5} more tables</p>
            )}
          </div>
        </ResultSection>
      )}

      {/* Sheets */}
      {sheets && sheets.length > 0 && (
        <ResultSection label={`SHEETS (${sheets.length})`}>
          <div className="space-y-3">
            {sheets.map((s, i) => (
              <div key={i} className="rounded-lg border border-cyber-border bg-cyber-bg/40 p-3">
                <p className="font-mono text-sm font-medium text-cyber-accent">{s.sheet_name}</p>
                <p className="mt-1 font-mono text-[10px] text-cyber-muted">
                  {s.rows} rows × {s.columns} columns
                </p>
                {s.column_names?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.column_names.slice(0, 12).map((c, ci) => (
                      <span key={ci} className="chip">{c}</span>
                    ))}
                    {s.column_names.length > 12 && (
                      <span className="chip">+{s.column_names.length - 12}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* Slides */}
      {slides && slides.length > 0 && (
        <ResultSection label={`SLIDES (${slides.length})`}>
          <div className="space-y-2">
            {slides.slice(0, 10).map((s) => (
              <div key={s.slide_number} className="rounded-lg border border-cyber-border bg-cyber-bg/40 p-3">
                <p className="font-mono text-xs text-cyber-accent">
                  Slide {s.slide_number}{s.title ? `: ${s.title}` : ''}
                </p>
                {s.text && (
                  <p className="mt-1 font-mono text-[11px] text-cyber-muted line-clamp-2">{s.text}</p>
                )}
              </div>
            ))}
            {slides.length > 10 && (
              <p className="font-mono text-[10px] text-cyber-muted">…{slides.length - 10} more slides</p>
            )}
          </div>
        </ResultSection>
      )}

      {/* Pages */}
      {pages && pages.length > 0 && !slides && (
        <ResultSection label={`PAGES (${pages.length})`}>
          <div className="space-y-2">
            {pages.slice(0, 5).map((p) => (
              <div key={p.page_number} className="rounded-lg border border-cyber-border/50 bg-cyber-bg/30 p-3">
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-cyber-accent/70">
                  Page {p.page_number}
                </p>
                <p className="font-mono text-[11px] leading-relaxed text-cyber-text line-clamp-4">
                  {p.text || <span className="text-cyber-muted italic">No text on this page</span>}
                </p>
              </div>
            ))}
            {pages.length > 5 && (
              <p className="font-mono text-[10px] text-cyber-muted">…{pages.length - 5} more pages (see full text below)</p>
            )}
          </div>
        </ResultSection>
      )}

      {/* Full extracted text */}
      {text && (
        <ResultSection label={`EXTRACTED TEXT (${text.split(/\s+/).length.toLocaleString()} words)`}>
          <TextPreview text={text} />
        </ResultSection>
      )}
    </div>
  );
}

export default function AnalyzerPage({
  title,
  description,
  accept,
  acceptLabel,
  icon = '◈',
  color = 'text-cyber-accent',
  analyze,
}: AnalyzerPageProps) {
  const [file, setFile]     = useState<File | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const runAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await analyze(file);
      setResult(data as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-2xl ${color}`}>{icon}</span>
          <h2 className={`font-mono text-xl font-bold tracking-wide ${color}`}>{title}</h2>
        </div>
        <p className="mt-1 text-sm text-cyber-muted">{description}</p>
      </div>

      {/* Dropzone */}
      <FileDropzone
        accept={accept}
        acceptLabel={acceptLabel}
        disabled={loading}
        onFiles={(files) => {
          setFile(files[0] ?? null);
          setResult(null);
          setError(null);
        }}
      />

      {/* File + Analyze button */}
      {file && (
        <div className="panel flex items-center justify-between px-5 py-4 animate-slide-up">
          <div>
            <p className="text-sm font-medium text-cyber-text">{file.name}</p>
            <p className="font-mono text-xs text-cyber-muted">
              {formatFileSize(file.size)} · ready to analyze
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={runAnalysis}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-cyber-accent/50 border-t-cyber-accent" />
                Analyzing…
              </span>
            ) : (
              'Analyze →'
            )}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="panel border-cyber-danger/30 p-4 animate-fade-in">
          <p className="font-mono text-xs text-cyber-danger">⚠ {error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="panel p-6 animate-fade-in">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-cyber-border border-t-cyber-accent" />
              <span className="absolute inset-0 flex items-center justify-center font-mono text-xs text-cyber-accent">{icon}</span>
            </div>
            <div className="text-center">
              <p className="font-mono text-sm text-cyber-text">Processing document…</p>
              <p className="mt-1 font-mono text-xs text-cyber-muted">Extracting content locally</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyber-success" />
            <p className="font-mono text-xs text-cyber-success">Analysis complete</p>
          </div>
          <AnalysisResults result={result} />
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
