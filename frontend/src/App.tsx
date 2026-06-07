import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Upload from '@/pages/Upload';
import PdfAnalyzer from '@/pages/PdfAnalyzer';
import ExcelAnalyzer from '@/pages/ExcelAnalyzer';
import PptAnalyzer from '@/pages/PptAnalyzer';
import DocAnalyzer from '@/pages/DocAnalyzer';
import OcrAnalyzer from '@/pages/OcrAnalyzer';
import Chat from '@/pages/Chat';
import Settings from '@/pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="analyze/pdf" element={<PdfAnalyzer />} />
        <Route path="analyze/excel" element={<ExcelAnalyzer />} />
        <Route path="analyze/ppt" element={<PptAnalyzer />} />
        <Route path="analyze/doc" element={<DocAnalyzer />} />
        <Route path="analyze/ocr" element={<OcrAnalyzer />} />
        <Route path="chat" element={<Chat />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
