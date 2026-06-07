import AnalyzerPage from '@/components/AnalyzerPage';
import { analyzePpt } from '@/api/client';

export default function PptAnalyzer() {
  return (
    <AnalyzerPage
      title="PowerPoint Analyzer"
      description="Extract slide text and notes from presentations for local analysis."
      accept=".pptx,.ppt"
      acceptLabel="PowerPoint (.pptx, .ppt)"
      analyze={(file) => analyzePpt({ file })}
    />
  );
}
