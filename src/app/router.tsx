import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PreviewApp, PreviewResult, PREVIEW_RESULT_PATH } from '@/containers/ticket/preview';
import App from './App';
import { JourneyPage } from '@/containers/home';
import { HomecomingInvitationPass } from '@/containers/ticket';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/journey" element={<JourneyPage ticket={<HomecomingInvitationPass />} />} />
        <Route path={PREVIEW_RESULT_PATH} element={<PreviewResult />} />
        <Route path="/preview/*" element={<PreviewApp />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}
