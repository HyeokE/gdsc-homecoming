import type { DepartureResult } from '../types/departure';
import { useTicketImageSave } from '../hooks/useTicketImageSave';
import { TicketSaveToast } from './TicketSaveToast';
import { BoardingPass } from './BoardingPass';

export interface FullTicketDownloadProps {
  result: DepartureResult;
  ticketId: string;
}

export function FullTicketDownload({ result, ticketId }: FullTicketDownloadProps) {
  const { captureRef, status, save } = useTicketImageSave(`full-${ticketId}`);

  return (
    <>
      <button
        type="button"
        className="ticket-detail__button ticket-detail__button--save"
        disabled={status === 'saving'}
        aria-busy={status === 'saving'}
        onClick={() => void save()}
      >
        {status === 'saving'
          ? '전체 티켓 준비 중…'
          : status === 'error'
            ? '전체 티켓 저장 다시 시도'
            : '전체 티켓 저장'}
      </button>
      <div className="ticket-detail__export" aria-hidden="true" inert>
        <div ref={captureRef} className="ticket-detail__export-capture">
          <BoardingPass result={result} displayMode="expanded" exportMode />
        </div>
      </div>
      {(status === 'success' || status === 'error') && (
        <TicketSaveToast
          key={status}
          error={status === 'error'}
          message={
            status === 'error'
              ? '전체 티켓을 준비하지 못했어요. 다시 시도해주세요.'
              : '전체 티켓 다운로드를 요청했어요.'
          }
        />
      )}
    </>
  );
}
