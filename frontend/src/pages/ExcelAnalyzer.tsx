import AnalyzerPage from '@/components/AnalyzerPage';
import { analyzeExcel } from '@/api/client';

export default function ExcelAnalyzer() {
  return (
    <AnalyzerPage
      title="Excel Analyzer"
      description="Parse spreadsheets, extract sheet data, and build searchable embeddings."
      accept=".xlsx,.xls,.csv"
      acceptLabel="Excel & CSV (.xlsx, .xls, .csv)"
      analyze={(file) => analyzeExcel({ file })}
    />
  );
}
