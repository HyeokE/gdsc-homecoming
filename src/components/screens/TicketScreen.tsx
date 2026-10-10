import type { Ref } from 'react'
import type { DemoTicket, Destination } from '../../types/ticket'
import { BoardingPass } from '../BoardingPass'
import { primaryButtonClass, secondaryButtonClass } from './InputScreen'
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
      className="w-full min-w-0 py-4 pb-[max(2rem,env(safe-area-inset-bottom))]"
      aria-labelledby="ticket-screen-title"
    >
      <p className="text-caption text-success">발급 완료</p>
      <h1
        id="ticket-screen-title"
        tabIndex={-1}
        className="mt-2 text-title font-semibold"
      >
        당신의 탑승권
      </h1>
      <p className="mt-4 text-body wrap-anywhere">{ticket.passengerName}</p>
      <p className="mt-1 text-caption text-muted">
        {destination.name} · {destination.city} ({destination.airportCode})
      </p>
      <div ref={ticketRef} className="mt-6" data-ticket-save-region>
        <BoardingPass result={ticket} />
      </div>
      <button
        type="button"
        onClick={onEnlarge}
        className="mt-2 inline-flex min-h-touch items-center text-caption text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        크게 보기
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saveStatus === 'saving'}
        aria-busy={saveStatus === 'saving'}
        className={`${primaryButtonClass} mt-4`}
      >
        {saveStatus === 'saving'
          ? '이미지 준비 중…'
          : saveStatus === 'error'
            ? '이미지 저장 다시 시도'
            : '탑승권 이미지 저장'}
      </button>
      <p
        role={saveStatus === 'error' ? 'alert' : 'status'}
        className={`mt-3 min-h-6 text-caption ${saveStatus === 'error' ? 'text-error' : 'text-muted'}`}
      >
        {saveStatus === 'error'
          ? (saveError ??
            '이미지를 준비하지 못했어요. 탑승권은 그대로 유지돼요. 다시 시도해주세요.')
          : saveStatus === 'success'
            ? '이미지 다운로드를 요청했어요. 브라우저의 다운로드를 확인해주세요.'
            : '실제 항공편이나 현장 입장권이 아닌 기념용 탑승권이에요.'}
      </p>
      <section
        className="mt-10 border-t border-board-seam pt-6"
        aria-labelledby="destination-heading"
      >
        <h2 id="destination-heading" className="text-body font-semibold">
          {destination.name}에서 시작하는 여행
        </h2>
        <p className="mt-3 text-body text-muted">{destination.introduction}</p>
        <h3 className="mt-6 text-caption font-semibold">
          여행을 표현할 세 가지 키워드
        </h3>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-body">
          {destination.keywords.map((keyword) => (
            <li key={keyword}>{keyword}</li>
          ))}
        </ul>
        <p className="mt-4 text-caption text-muted">
          정답은 없어요. 색상이나 소품 하나로 나만의 여행을 표현해보세요.
          <br />
          11월 날씨에 맞게 따뜻하고 편안하게 준비해주세요.
        </p>
      </section>
      <section
        className="mt-8 border-t border-board-seam pt-6"
        aria-labelledby="companions-heading"
      >
        <h2 id="companions-heading" className="text-body font-semibold">
          이 여행지로 떠나는 사람들
        </h2>
        {companionStatus === 'ready' && companionCount !== undefined ? (
          <>
            <p className="mt-3 text-title font-semibold">
              {companionCount}
              <span className="text-body font-normal text-muted"> / 4명</span>
            </p>
            <p className="mt-2 text-caption text-muted">
              {companionCount === 1
                ? '첫 번째 탑승객이에요.'
                : `나를 포함해 ${companionCount}명이 같은 여행지의 탑승권을 받았어요.`}
            </p>
          </>
        ) : companionStatus === 'error' ? (
          <>
            <p role="alert" className="mt-3 text-caption text-error">
              동행 인원을 확인하지 못했어요. 탑승권은 그대로 유지돼요.
            </p>
            <button
              type="button"
              onClick={onCompanionRetry}
              className={`${secondaryButtonClass} mt-3`}
            >
              인원 다시 확인
            </button>
          </>
        ) : (
          <p role="status" className="mt-3 text-caption text-muted">
            동행 인원 확인 중…
          </p>
        )}
      </section>
      <section
        className="mt-8 border-t border-board-seam pt-6"
        aria-labelledby="reissue-heading"
      >
        <h2 id="reissue-heading" className="text-body font-semibold">
          다른 여행지도 궁금하다면
        </h2>
        {used ? (
          <p className="mt-3 text-caption text-muted">
            재발급 기회를 사용했어요. 현재 탑승권으로 여행을 준비해주세요.
          </p>
        ) : (
          <>
            <p className="mt-3 text-caption text-muted">
              여행지를 한 번 바꿀 수 있어요. 재발급하면 현재 목적지로 돌아올 수
              없어요.
            </p>
            <button
              type="button"
              onClick={onReissueRequest}
              disabled={reissueBusy || reissueStatus === 'unavailable'}
              aria-busy={reissueBusy}
              className={`${secondaryButtonClass} mt-4 w-full text-error`}
            >
              {reissueBusy
                ? '재발급 결과 확인 중…'
                : reissueStatus === 'unavailable'
                  ? '변경 가능한 여행지 없음'
                  : '다른 여행지로 재발급 · 1회 가능'}
            </button>
            {reissueStatus === 'unavailable' && (
              <p role="status" className="mt-3 text-caption text-info">
                현재 탑승권과 재발급 기회는 유지돼요.
              </p>
            )}
            {reissueError && (
              <p role="alert" className="mt-3 text-caption text-error">
                {reissueError}
              </p>
            )}
          </>
        )}
      </section>
    </section>
  )
}
