import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PreviewApp, PreviewResult, PREVIEW_RESULT_PATH } from '@/containers/ticket/preview';
import App from './App';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={PREVIEW_RESULT_PATH} element={<PreviewResult />} />
        <Route path="/preview/*" element={<PreviewApp />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}
