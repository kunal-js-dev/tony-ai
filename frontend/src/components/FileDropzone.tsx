import { useCallback, useRef, useState } from 'react';

interface FileDropzoneProps {
  accept?: string;
  acceptLabel?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

export default function FileDropzone({
  accept,
  acceptLabel,
  multiple = false,
  disabled = false,
  onFiles,
}: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || disabled) return;
      const files = Array.from(fileList);
      onFiles(multiple ? files : files.slice(0, 1));
    },
    [disabled, multiple, onFiles],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        'panel flex cursor-pointer flex-col items-center justify-center gap-3 p-10 transition-all',
        dragging
          ? 'border-cyber-accent bg-cyber-accent/5 shadow-glow'
          : 'hover:border-cyber-accent/40',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div
        className={[
          'flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed font-mono text-2xl transition-colors',
          dragging
            ? 'border-cyber-accent text-cyber-accent'
            : 'border-cyber-border text-cyber-muted',
        ].join(' ')}
      >
        ↑
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-cyber-text">
          {dragging ? 'Drop files here' : 'Drag & drop or click to browse'}
        </p>
        {acceptLabel && (
          <p className="mt-1 font-mono text-xs text-cyber-muted">{acceptLabel}</p>
        )}
        <p className="mt-2 text-[10px] uppercase tracking-wider text-cyber-muted/50">
          Processed locally — never uploaded to cloud
        </p>
      </div>
    </div>
  );
}
