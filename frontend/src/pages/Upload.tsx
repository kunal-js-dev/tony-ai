import { useState } from 'react';
import { Link } from 'react-router-dom';
import FileDropzone from '@/components/FileDropzone';
import { uploadFile } from '@/api/client';
import type { DocFile } from '@/types';
import { formatBytes, formatDate } from '@/utils/format';

export default function Upload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState<DocFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (files: File[]) => {
    setError(null);
    setUploading(true);

    for (const file of files) {
      setProgress(0);
      try {
        const res = await uploadFile(file, setProgress);
        setUploaded((prev) => [res.file, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        break;
      }
    }

    setUploading(false);
    setProgress(0);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-mono text-xl font-bold tracking-wide text-cyber-accent">
          Upload Documents
        </h2>
        <p className="mt-1 text-sm text-cyber-muted">
          Files are stored locally and indexed for offline RAG chat
        </p>
      </div>

      <FileDropzone
        accept=".pdf,.xlsx,.xls,.csv,.pptx,.ppt,.docx,.doc,.png,.jpg,.jpeg,.tiff,.bmp,.webp"
        acceptLabel="PDF · Excel · PPT · Word · Images"
        multiple
        disabled={uploading}
        onFiles={handleUpload}
      />

      {uploading && (
        <div className="panel p-4">
          <div className="mb-2 flex justify-between font-mono text-xs">
            <span className="text-cyber-accent">Uploading…</span>
            <span className="text-cyber-muted">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-cyber-border">
            <div
              className="h-full bg-cyber-accent transition-all shadow-glow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="panel border-cyber-danger/30 p-4">
          <p className="text-sm text-cyber-danger">{error}</p>
        </div>
      )}

      {uploaded.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <h3 className="font-mono text-sm text-cyber-accent">Uploaded</h3>
          </div>
          <div className="divide-y divide-cyber-border">
            {uploaded.map((file) => (
              <div key={file.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-cyber-text">{file.original_name}</p>
                  <p className="font-mono text-[10px] text-cyber-muted">
                    ID {file.id} · {file.file_type} · {formatBytes(file.filesize)} ·{' '}
                    {formatDate(file.created_at)}
                  </p>
                </div>
                <Link
                  to={`/analyze/${file.file_type === 'pdf' ? 'pdf' : file.file_type}`}
                  className="btn-ghost text-cyber-accent"
                >
                  Analyze →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
