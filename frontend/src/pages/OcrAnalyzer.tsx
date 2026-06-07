import AnalyzerPage from '@/components/AnalyzerPage';
import { analyzeOcr } from '@/api/client';

export default function OcrAnalyzer() {
  return (
    <AnalyzerPage
      title="OCR Analyzer"
      description="Optical character recognition for scanned images and documents — fully offline."
      accept=".png,.jpg,.jpeg,.tiff,.tif,.bmp,.webp,.pdf"
      acceptLabel="Images & scanned PDFs"
      analyze={(file) => analyzeOcr({ file })}
    />
  );
}
