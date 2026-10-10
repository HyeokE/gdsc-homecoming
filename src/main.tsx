import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { PreviewApp } from './routes/PreviewApp'
import { PreviewResult } from './routes/PreviewResult'
import { PREVIEW_RESULT_PATH } from './routes/previewResultRoute'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path={PREVIEW_RESULT_PATH} element={<PreviewResult />} />
        <Route path="/preview/*" element={<PreviewApp />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
