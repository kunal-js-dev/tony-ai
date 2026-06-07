import AnalyzerPage from '@/components/AnalyzerPage';
import { analyzePdf } from '@/api/client';

export default function PdfAnalyzer() {
  return (
    <AnalyzerPage
      title="PDF Analyzer"
      description="Extract text, summarize, and index PDF documents for offline RAG."
      accept=".pdf"
      acceptLabel="PDF files (.pdf)"
      analyze={(file) => analyzePdf({ file })}
    />
  );
}
