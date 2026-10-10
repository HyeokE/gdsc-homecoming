import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BoardingPassStub } from '../components/BoardingPass';
import { TicketSaveToast } from '../components/TicketSaveToast';
import { FullTicketDownload } from '../components/FullTicketDownload';
import { departurePreview } from '../fixtures/departurePreview';
import { getDestination } from '../constants/destinations';
import { useTicketImageSave } from '../hooks/useTicketImageSave';
import { PREVIEW_RESULT_ID, PREVIEW_RESULT_PATH } from './previewResultRoute';
import { EnlargedTicketModal } from '../components/EnlargedTicketModal';
import '../styles/ticket-detail.css';

export { PREVIEW_RESULT_PATH };

export function PreviewResult() {
  const location = useLocation();
  const state: unknown = location.state;
  const time = state && typeof state === 'object' && 'boardingTime' in state ? state.boardingTime : undefined;
  const boardingTime = typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : undefined;
  const result = boardingTime ? { ...departurePreview, boardingTime } : departurePreview;
  const { captureRef: ref, status, save } = useTicketImageSave(PREVIEW_RESULT_ID);
  const [enlarged, setEnlarged] = useState(false);
  const destination = getDestination('jp');
  return (
    <main className="ticket-result-page min-h-svh w-full px-page py-8 text-foreground">
      <section className="ticket-detail mx-auto w-full max-w-mobile">
        <h1 className="sr-only" tabIndex={-1}>
          당신의 탑승권
        </h1>
        <div className="ticket-detail__ticket">
          <div ref={ref} className="ticket-detail-screen__stub">
            <BoardingPassStub result={result} />
          </div>
          <button
            type="button"
            className="ticket-detail__inspect"
            aria-label="탑승권 3D로 보기"
            aria-haspopup="dialog"
            onClick={() => setEnlarged(true)}
          />
        </div>
        <div className="ticket-detail__actions">
          <FullTicketDownload result={result} ticketId={PREVIEW_RESULT_ID} />
          <button
            type="button"
            className="ticket-detail__button"
            onClick={() => void save()}
            disabled={status === 'saving'}
            aria-busy={status === 'saving'}
          >
            {status === 'saving' ? '이미지 준비 중…' : status === 'error' ? '조각 티켓 저장 재시도' : '조각 티켓 저장'}
          </button>
        </div>
        <div className="ticket-detail__replay">
          <Link
            className="ticket-detail__button"
            to="/preview/departure"
            state={{ replayBoardingTime: result.boardingTime }}
          >
            발권 애니메이션 다시보기
          </Link>
        </div>
        {(status === 'success' || status === 'error') && (
          <TicketSaveToast
            key={status}
            error={status === 'error'}
            message={
              status === 'error' ? '이미지를 준비하지 못했어요. 다시 시도해주세요.' : '조각 티켓 다운로드를 요청했어요.'
            }
          />
        )}
        <section className="ticket-detail__section ticket-detail__destination">
          <h2 className="ticket-detail__heading">{destination.name}에서 돌아오는 길</h2>
          <p className="ticket-detail__description">{destination.introduction}</p>
          <ul className="ticket-detail__keywords">
            {destination.keywords.map((word) => (
              <li key={word}>{word}</li>
            ))}
          </ul>
        </section>
      </section>
      <EnlargedTicketModal open={enlarged} result={result} onClose={() => setEnlarged(false)} />
    </main>
  );
}
