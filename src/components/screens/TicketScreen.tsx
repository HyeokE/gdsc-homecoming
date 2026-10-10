import type { Ref } from 'react'
import type { DemoTicket, Destination } from '../../types/ticket'
import { BoardingPassStub } from '../BoardingPass'
import '../../styles/ticket-detail.css'
export interface TicketScreenProps {
  ticket: DemoTicket
  destination: Destination
  ticketRef?: Ref<HTMLDivElement>
  saveStatus?: 'idle' | 'saving' | 'success' | 'error'
  saveError?: string
  onSave: () => void
  onEnlarge: () => void
  companionStatus?: 'loading' | 'ready' | 'error'
  companionCount?: number
  onCompanionRetry: () => void
  reissueStatus?:
    | 'available'
    | 'loading'
    | 'used'
    | 'unavailable'
    | 'error'
    | 'checking-result'
  reissueError?: string
  onReissueRequest: () => void
}
export function TicketScreen({
  ticket,
  destination,
  ticketRef,
  saveStatus = 'idle',
  saveError,
  onSave,
  onEnlarge,
  companionStatus = 'loading',
  companionCount,
  onCompanionRetry,
  reissueStatus = 'available',
  reissueError,
  onReissueRequest,
}: TicketScreenProps) {
  const reissueBusy =
    reissueStatus === 'loading' || reissueStatus === 'checking-result'
  const used = ticket.reissueUsed || reissueStatus === 'used'
  return (
    <section
      className="ticket-detail-screen ticket-detail"
      aria-labelledby="ticket-screen-title"
    >
      <h1 id="ticket-screen-title" tabIndex={-1} className="sr-only">
        당신의 탑승권
      </h1>
      <div
        ref={ticketRef}
        className="ticket-detail-screen__stub"
        data-ticket-save-region
      >
        <BoardingPassStub result={ticket} />
      </div>
      <div className="ticket-detail__actions">
        <button
          type="button"
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          aria-busy={saveStatus === 'saving'}
          className="ticket-detail__button ticket-detail__button--save"
        >
          {saveStatus === 'saving'
            ? '이미지 준비 중…'
            : saveStatus === 'error'
              ? '저장 다시 시도'
              : '이미지 저장'}
        </button>
        <button
          type="button"
          onClick={onEnlarge}
          className="ticket-detail__button"
        >
          크게 보기
        </button>
      </div>
      <p
        role={saveStatus === 'error' ? 'alert' : 'status'}
        className={`ticket-detail__save-note ${saveStatus === 'error' ? 'ticket-detail__error' : ''}`}
      >
        {saveStatus === 'error'
          ? (saveError ?? '이미지를 준비하지 못했어요. 다시 시도해주세요.')
          : saveStatus === 'success'
            ? '다운로드를 요청했어요. 브라우저에서 확인해주세요.'
            : '항공편·현장 입장권이 아닌 기념 탑승권이에요.'}
      </p>
      <section
        className="ticket-detail__section ticket-detail__destination"
        aria-labelledby="destination-heading"
      >
        <h2 id="destination-heading" className="ticket-detail__heading">
          {destination.name}에서 시작하는 여행
        </h2>
        <p className="ticket-detail__description">{destination.introduction}</p>
        <h3 className="ticket-detail__label">여행을 표현할 세 가지 키워드</h3>
        <ul className="ticket-detail__keywords">
          {destination.keywords.map((keyword) => (
            <li key={keyword}>{keyword}</li>
          ))}
        </ul>
        <p className="ticket-detail__note">
          색상이나 소품 하나로 여행지를 표현해보세요. 11월 날씨에 맞게 따뜻하게
          준비해주세요.
        </p>
      </section>
      <section
        className="ticket-detail__section"
        aria-labelledby="companions-heading"
      >
        <h2 id="companions-heading" className="ticket-detail__heading">
          이 여행지로 떠나는 사람들
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
                : `나를 포함해 ${companionCount}명이 같은 여행지의 탑승권을 받았어요.`}
            </p>
          </>
        ) : companionStatus === 'error' ? (
          <>
            <p
              role="alert"
              className="ticket-detail__note ticket-detail__error"
            >
              동행 인원을 확인하지 못했어요. 탑승권은 그대로 유지돼요.
            </p>
            <button
              type="button"
              onClick={onCompanionRetry}
              className="ticket-detail__button ticket-detail__retry"
            >
              인원 다시 확인
            </button>
          </>
        ) : (
          <p role="status" className="ticket-detail__note">
            동행 인원 확인 중…
          </p>
        )}
      </section>
      <section
        className="ticket-detail__section"
        aria-labelledby="reissue-heading"
      >
        <h2 id="reissue-heading" className="ticket-detail__heading">
          다른 여행지도 궁금하다면
        </h2>
        {used ? (
          <p className="ticket-detail__note">
            재발급 기회를 사용했어요. 현재 탑승권으로 여행을 준비해주세요.
          </p>
        ) : (
          <>
            <p className="ticket-detail__note">
              여행지를 한 번 바꿀 수 있어요. 재발급하면 현재 목적지로 돌아올 수
              없어요.
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
                  : '다른 여행지로 재발급 · 1회 가능'}
            </button>
            {reissueStatus === 'unavailable' && (
              <p role="status" className="ticket-detail__note">
                현재 탑승권과 재발급 기회는 유지돼요.
              </p>
            )}
            {reissueError && (
              <p
                role="alert"
                className="ticket-detail__note ticket-detail__error"
              >
                {reissueError}
              </p>
            )}
          </>
        )}
      </section>
    </section>
  )
}
