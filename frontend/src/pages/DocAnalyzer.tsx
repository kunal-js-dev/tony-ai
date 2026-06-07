import AnalyzerPage from '@/components/AnalyzerPage';
import { analyzeDoc } from '@/api/client';

export default function DocAnalyzer() {
  return (
    <AnalyzerPage
      title="Word Document Analyzer"
      description="Extract text from DOCX/DOC files, analyze structure, and index for offline RAG search."
      accept=".docx,.doc"
      acceptLabel="Word Documents (.docx, .doc)"
      icon="▨"
      color="text-blue-400"
      analyze={(file) => analyzeDoc({ file }) as Promise<Record<string, unknown>>}
    />
  );
}
