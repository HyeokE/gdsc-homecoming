import type { Ref } from 'react';
import type { DemoTicket, Destination } from '../../types/ticket';
import { BoardingPassStub } from '../BoardingPass';
import { TicketSaveToast } from '../TicketSaveToast';
import { FullTicketDownload } from '../FullTicketDownload';
import '../../styles/ticket-detail.css';
export interface TicketScreenProps {
  ticket: DemoTicket;
  enterFromIssuer?: boolean;
  destination: Destination;
  ticketRef?: Ref<HTMLDivElement>;
  saveStatus?: 'idle' | 'saving' | 'success' | 'error';
  saveError?: string;
  onSave: () => void;
  onEnlarge: () => void;
  onReplay: () => void;
  isTestAccount?: boolean;
  companionStatus?: 'loading' | 'ready' | 'error';
  companionCount?: number;
  onCompanionRetry: () => void;
  reissueStatus?: 'available' | 'loading' | 'used' | 'unavailable' | 'error' | 'checking-result';
  reissueError?: string;
  onReissueRequest: () => void;
}
export function TicketScreen({
  ticket,
  enterFromIssuer = false,
  destination,
  ticketRef,
  saveStatus = 'idle',
  saveError,
  onSave,
  onEnlarge,
  onReplay,
  isTestAccount = false,
  companionStatus = 'loading',
  companionCount,
  onCompanionRetry,
  reissueStatus = 'available',
  reissueError,
  onReissueRequest,
}: TicketScreenProps) {
  const reissueBusy = reissueStatus === 'loading' || reissueStatus === 'checking-result';
  const used = ticket.reissueUsed || reissueStatus === 'used';
  return (
    <section
      className="ticket-detail-screen ticket-detail"
      aria-labelledby="ticket-screen-title"
      data-arriving={enterFromIssuer || undefined}
    >
      <h1 id="ticket-screen-title" tabIndex={-1} className="sr-only">
        당신의 탑승권
      </h1>
      <div className="ticket-detail__ticket">
        <div ref={ticketRef} className="ticket-detail-screen__stub" data-ticket-save-region>
          <BoardingPassStub result={ticket} stubLayoutId="ticket-stub" />
        </div>
        <button
          type="button"
          className="ticket-detail__inspect"
          aria-label="탑승권 3D로 보기"
          aria-haspopup="dialog"
          onClick={onEnlarge}
        />
      </div>
      <div className="ticket-detail__actions">
        <FullTicketDownload result={ticket} ticketId={ticket.id} />
        <button
          type="button"
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          aria-busy={saveStatus === 'saving'}
          className="ticket-detail__button"
        >
          {saveStatus === 'saving'
            ? '이미지 준비 중…'
            : saveStatus === 'error'
              ? '조각 티켓 저장 재시도'
              : '조각 티켓 저장'}
        </button>
      </div>
      <div className="ticket-detail__replay">
        <button type="button" onClick={onReplay} className="ticket-detail__button">
          발권 애니메이션 다시보기
        </button>
      </div>
      {(saveStatus === 'success' || saveStatus === 'error') && (
        <TicketSaveToast
          key={saveStatus}
          error={saveStatus === 'error'}
          message={
            saveStatus === 'error'
              ? (saveError ?? '이미지를 준비하지 못했어요. 다시 시도해주세요.')
              : '조각 티켓 다운로드를 요청했어요.'
          }
        />
      )}
      <section className="ticket-detail__section ticket-detail__destination" aria-labelledby="destination-heading">
        <h2 id="destination-heading" className="ticket-detail__heading">
          {destination.name}에서 돌아오는 길
        </h2>
        <p className="ticket-detail__description">{destination.introduction}</p>
        <h3 className="ticket-detail__label">여행을 표현할 세 가지 키워드</h3>
        <ul className="ticket-detail__keywords">
          {destination.keywords.map((keyword) => (
            <li key={keyword}>{keyword}</li>
          ))}
        </ul>
        <p className="ticket-detail__note">
          색상이나 소품 하나로 출발 국가를 표현해보세요. 11월 날씨에 맞게 따뜻하게 준비해주세요.
        </p>
      </section>
      <section className="ticket-detail__section" aria-labelledby="companions-heading">
        <h2 id="companions-heading" className="ticket-detail__heading">
          이 국가에서 함께 귀국하는 사람들
        </h2>
        {companionStatus === 'ready' && companionCount !== undefined ? (
          <>
            <p className="ticket-detail__count">
              {companionCount}
              <span className="ticket-detail__count-total"> / 4명</span>
            </p>
            <p className="ticket-detail__note">
              {companionCount === 1
                ? '첫 번째 탑승객이에요.'
                : `나를 포함해 ${companionCount}명이 같은 국가에서 귀국하는 탑승권을 받았어요.`}
            </p>
          </>
        ) : companionStatus === 'error' ? (
          <>
            <p role="alert" className="ticket-detail__note ticket-detail__error">
              동행 인원을 확인하지 못했어요. 탑승권은 그대로 유지돼요.
            </p>
            <button type="button" onClick={onCompanionRetry} className="ticket-detail__button ticket-detail__retry">
              인원 다시 확인
            </button>
          </>
        ) : (
          <p role="status" className="ticket-detail__note">
            동행 인원 확인 중…
          </p>
        )}
      </section>
      <section className="ticket-detail__section" aria-labelledby="reissue-heading">
        <h2 id="reissue-heading" className="ticket-detail__heading">
          다른 여행지도 궁금하다면
        </h2>
        {used ? (
          <p className="ticket-detail__note">재발급 기회를 사용했어요. 현재 탑승권으로 여행을 준비해주세요.</p>
        ) : (
          <>
            <p className="ticket-detail__note">
              {isTestAccount
                ? '테스트 계정은 횟수 제한 없이 다른 여행지로 재발급할 수 있어요.'
                : '여행지를 한 번 바꿀 수 있어요. 재발급하면 현재 목적지로 돌아올 수 없어요.'}
            </p>
            <button
              type="button"
              onClick={onReissueRequest}
              disabled={reissueBusy || reissueStatus === 'unavailable'}
              aria-busy={reissueBusy}
              className="ticket-detail__button ticket-detail__reissue"
            >
              {reissueBusy
                ? '재발급 결과 확인 중…'
                : reissueStatus === 'unavailable'
                  ? '변경 가능한 여행지 없음'
                  : isTestAccount
                    ? '다른 여행지로 재발급 · 테스트 무제한'
                    : '다른 여행지로 재발급 · 1회 가능'}
            </button>
            {reissueStatus === 'unavailable' && (
              <p role="status" className="ticket-detail__note">
                현재 탑승권과 재발급 기회는 유지돼요.
              </p>
            )}
            {reissueError && (
              <p role="alert" className="ticket-detail__note ticket-detail__error">
                {reissueError}
              </p>
            )}
          </>
        )}
      </section>
    </section>
  );
}
