import type {
  AnalysisResult,
  AnalyzeType,
  AppSettings,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  FileDetailResponse,
  FilesListResponse,
  HealthResponse,
  SettingsUpdateRequest,
  StatsResponse,
  UploadResponse,
} from '@/types';

const API_BASE = '/api';
const CHAT_FALLBACK_BASE = 'http://localhost:5000/api';

const DEFAULT_SETTINGS: AppSettings = {
  chat_model: 'llama3.2',
  embed_model: 'nomic-embed-text',
  chunk_size: 800,
  chunk_overlap: 120,
  rag_top_k: 5,
  system_prompt: 'You are a helpful offline document assistant.',
};

class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: string; error?: string; message?: string };
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.error === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;
    return res.statusText || `Request failed (${res.status})`;
  } catch {
    return res.statusText || `Request failed (${res.status})`;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, init);
    if (!res.ok) {
      throw new ApiClientError(await parseError(res), res.status);
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  } catch (error) {
    if (path === '/chat') {
      const fallbackRes = await fetch(`${CHAT_FALLBACK_BASE}${path}`, init);
      if (!fallbackRes.ok) {
        throw new ApiClientError(await parseError(fallbackRes), fallbackRes.status);
      }
      if (fallbackRes.status === 204) {
        return undefined as T;
      }
      return (await fallbackRes.json()) as T;
    }
    throw error;
  }
}

function parseSettings(raw: Record<string, unknown>): AppSettings {
  return {
    chat_model: String(raw.chat_model ?? DEFAULT_SETTINGS.chat_model),
    embed_model: String(raw.embed_model ?? DEFAULT_SETTINGS.embed_model),
    chunk_size: Number(raw.chunk_size ?? DEFAULT_SETTINGS.chunk_size),
    chunk_overlap: Number(raw.chunk_overlap ?? DEFAULT_SETTINGS.chunk_overlap),
    rag_top_k: Number(raw.rag_top_k ?? DEFAULT_SETTINGS.rag_top_k),
    system_prompt: String(raw.system_prompt ?? DEFAULT_SETTINGS.system_prompt),
  };
}

function normalizeHealth(raw: Record<string, unknown>): HealthResponse {
  const ollama = (raw.ollama as { online?: boolean; models?: string[] }) ?? {};
  const chroma = (raw.chromadb as { chunks?: number }) ?? {};
  return {
    status: (raw.status as HealthResponse['status']) ?? 'ok',
    version: String(raw.version ?? '1.0.0'),
    ollama_available: Boolean(raw.ollama_available ?? ollama.online),
    ollama_models: (raw.ollama_models as string[]) ?? ollama.models ?? [],
    chromadb_chunks: Number(raw.chromadb_chunks ?? chroma.chunks ?? 0),
    database_ok: Boolean(raw.database_ok ?? raw.database_exists),
    uptime_seconds: raw.uptime_seconds as number | undefined,
  };
}

const ANALYZE_PATH: Record<AnalyzeType, string> = {
  pdf: 'pdf',
  excel: 'excel',
  ppt: 'ppt',
  doc: 'doc',
  ocr: 'ocr',
};

// ── Health & Stats ──────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthResponse> {
  const raw = await request<Record<string, unknown>>('/health');
  return normalizeHealth(raw);
}

export async function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>('/stats');
}

// ── Upload ──────────────────────────────────────────────────────────────────

export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as Record<string, unknown>;
          resolve({
            file: (data.file ?? data) as UploadResponse['file'],
            message: data.message as string | undefined,
          });
        } catch {
          reject(new ApiClientError('Invalid JSON response', xhr.status));
        }
      } else {
        reject(new ApiClientError(xhr.responseText || xhr.statusText, xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiClientError('Network error', 0));
    xhr.send(form);
  });
}

// ── Files ───────────────────────────────────────────────────────────────────

export async function listFiles(params?: {
  limit?: number;
  offset?: number;
  file_type?: string;
}): Promise<FilesListResponse> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.offset != null) qs.set('offset', String(params.offset));
  if (params?.file_type) qs.set('file_type', params.file_type);
  const query = qs.toString();
  const raw = await request<{ files: FilesListResponse['files']; count?: number; total?: number }>(
    `/files${query ? `?${query}` : ''}`,
  );
  let files = raw.files ?? [];
  if (params?.limit) files = files.slice(0, params.limit);
  return { files, total: raw.total ?? raw.count ?? files.length };
}

export async function getFile(id: number): Promise<FileDetailResponse> {
  const raw = await request<Record<string, unknown>>(`/file/${id}`);
  return {
    file: raw as FileDetailResponse['file'],
    document: raw.document_id
      ? {
          id: raw.document_id as number,
          file_id: id,
          title: raw.title as string | undefined,
          summary: raw.summary as string | undefined,
          content: raw.content_preview as string | undefined,
          page_count: Number(raw.page_count ?? 0),
          word_count: Number(raw.word_count ?? 0),
        }
      : undefined,
  };
}

export async function deleteFile(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/file/${id}`, { method: 'DELETE' });
}

// ── Analyze ─────────────────────────────────────────────────────────────────

export async function analyzeDocument(
  type: AnalyzeType,
  payload: { file_id: number } | { file: File },
): Promise<AnalysisResult> {
  const path = ANALYZE_PATH[type];

  if ('file' in payload) {
    const form = new FormData();
    form.append('file', payload.file);
    return request<AnalysisResult>(`/analyze/${path}`, {
      method: 'POST',
      body: form,
    });
  }

  return request<AnalysisResult>(`/analyze/${path}?file_id=${payload.file_id}`, {
    method: 'POST',
  });
}

export const analyzePdf = (payload: { file_id: number } | { file: File }) =>
  analyzeDocument('pdf', payload);

export const analyzeExcel = (payload: { file_id: number } | { file: File }) =>
  analyzeDocument('excel', payload);

export const analyzePpt = (payload: { file_id: number } | { file: File }) =>
  analyzeDocument('ppt', payload);

export const analyzeDoc = (payload: { file_id: number } | { file: File }) =>
  analyzeDocument('doc', payload);

export const analyzeOcr = (payload: { file_id: number } | { file: File }) =>
  analyzeDocument('ocr', payload);

// ── Chat ────────────────────────────────────────────────────────────────────

export async function sendChat(body: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: false }),
  });
}

export async function streamChat(
  body: ChatRequest,
  onChunk: (chunk: ChatStreamChunk) => void,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response | null = null;

  try {
    res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    });
  } catch (error) {
    try {
      res = await fetch(`${CHAT_FALLBACK_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, stream: true }),
        signal,
      });
    } catch (fallbackError) {
      throw new ApiClientError('Failed to reach backend on ports 8000 and 5000', 0);
    }
  }

  if (res && !res.ok) {
    try {
      res = await fetch(`${CHAT_FALLBACK_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, stream: true }),
        signal,
      });
    } catch (fallbackError) {
      throw new ApiClientError('Failed to reach backend on ports 8000 and 5000', 0);
    }
  }

  if (!res || !res.ok) {
    throw new ApiClientError(await parseError(res), res.status);
  }

  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const data = (await res.json()) as ChatResponse;
    onChunk({ type: 'token', content: data.response });
    onChunk({
      type: 'done',
      session_id: data.session_id,
      source: data.source,
      contexts: data.contexts,
    });
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new ApiClientError('No response body', 500);
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('data:')) {
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') {
          onChunk({ type: 'done' });
          continue;
        }
        try {
          onChunk(JSON.parse(payload) as ChatStreamChunk);
        } catch {
          onChunk({ type: 'token', content: payload });
        }
        continue;
      }

      try {
        onChunk(JSON.parse(trimmed) as ChatStreamChunk);
      } catch {
        onChunk({ type: 'token', content: trimmed });
      }
    }
  }

  if (buffer.trim()) {
    try {
      onChunk(JSON.parse(buffer.trim()) as ChatStreamChunk);
    } catch {
      onChunk({ type: 'token', content: buffer.trim() });
    }
  }
}

// ── Settings ────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const raw = await request<Record<string, unknown>>('/settings');
  return parseSettings(raw);
}

export async function updateSettings(
  settings: SettingsUpdateRequest,
): Promise<AppSettings> {
  const raw = await request<Record<string, unknown>>('/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return parseSettings(raw);
}

export { ApiClientError };
