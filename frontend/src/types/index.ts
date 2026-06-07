export type FileType = 'pdf' | 'excel' | 'ppt' | 'doc' | 'ocr' | 'image' | 'other';
export type FileStatus = 'uploaded' | 'processing' | 'processed' | 'error';
export type ChatRole = 'user' | 'assistant' | 'system';
export type AnalyzeType = 'pdf' | 'excel' | 'ppt' | 'doc' | 'ocr';

export interface DocFile {
  id: number;
  filename: string;
  original_name: string;
  filepath?: string;
  filesize: number;
  mime_type?: string;
  file_type: FileType | string;
  status: FileStatus | string;
  created_at: string;
  updated_at?: string;
}

export interface Document {
  id: number;
  file_id: number;
  title?: string;
  content?: string;
  summary?: string;
  page_count: number;
  word_count: number;
  metadata_json?: string;
  processed_at?: string;
}

export interface RagIngestResult {
  chunks: number;
  embeddings: number;
}

export interface AnalysisResult {
  file_id: number;
  document_id: number;
  title: string;
  summary: string;
  page_count: number;
  word_count: number;
  content_preview: string;
  metadata: Record<string, unknown>;
  rag: RagIngestResult;
  file?: DocFile;
  document?: Document;
}

export interface UploadResponse {
  file: DocFile;
  message?: string;
}

export interface FilesListResponse {
  files: DocFile[];
  total: number;
}

export interface FileDetailResponse {
  file: DocFile;
  document?: Document;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  ollama_available: boolean;
  ollama_models: string[];
  chromadb_chunks: number;
  database_ok: boolean;
  uptime_seconds?: number;
}

export interface StatsResponse {
  total_files: number;
  total_documents: number;
  total_chunks: number;
  total_sessions: number;
  total_messages: number;
  storage_bytes: number;
}

export interface ContextChunk {
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

export interface ChatMessage {
  id?: number;
  role: ChatRole;
  content: string;
  source?: string;
  created_at?: string;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  file_ids?: number[];
  stream?: boolean;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  source: string;
  contexts?: ContextChunk[];
  timestamp?: string;
}

export interface ChatStreamChunk {
  type: 'token' | 'done' | 'error';
  content?: string;
  session_id?: string;
  source?: string;
  contexts?: ContextChunk[];
  error?: string;
}

export interface AppSettings {
  chat_model: string;
  embed_model: string;
  chunk_size: number;
  chunk_overlap: number;
  rag_top_k: number;
  system_prompt: string;
}

export interface SettingsUpdateRequest {
  chat_model?: string;
  embed_model?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  rag_top_k?: number;
  system_prompt?: string;
}

export interface ApiError {
  detail?: string;
  error?: string;
  message?: string;
}

export interface ChatSession {
  id: string;
  title?: string;
  file_id?: number;
  created_at: string;
  updated_at: string;
}
