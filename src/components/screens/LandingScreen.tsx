import { primaryButtonClass } from './InputScreen'
import { PaperTicket, TicketPerforation } from '../PaperTicket'
import '../../styles/landing.css'

export interface LandingScreenProps {
  onStart: () => void
  disabled?: boolean
}

export function LandingScreen({
  onStart,
  disabled = false,
}: LandingScreenProps) {
  return (
    <PaperTicket titleId="landing-title" className="landing">
      <h1
        id="landing-title"
        aria-label="GDG HOME COMING"
        tabIndex={-1}
        className="paper-ticket__display landing__title"
      >
        <span>HOME</span>
        <span>COMING</span>
      </h1>
      <p className="landing__invitation">
        다시 만나는 우리,
        <br />
        이번엔 어디로 떠날까요?
      </p>
      <p className="landing__intro">
        나만의 여행지를 뽑고, 홈커밍 탑승권을 받아보세요.
      </p>
      <TicketPerforation />
      <dl className="landing__details">
        <div className="landing__detail">
          <dt>일시</dt>
          <dd className="landing__schedule">
            <time dateTime="2026-11-21T15:00:00+09:00">2026.11.21 15:00</time>
            <span>
              ~ <time dateTime="2026-11-22T04:00:00+09:00">11.22 04:00</time>
            </span>
          </dd>
        </div>
        <div className="landing__detail">
          <dt>장소</dt>
          <dd>
            <a
              href="https://naver.me/GMmLF6Ap"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="성수 그린힐드 지도 보기 (새 탭)"
              className="landing__venue"
            >
              성수 그린힐드 <span aria-hidden="true">↗</span>
            </a>
          </dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className={`${primaryButtonClass} landing__start`}
      >
        <span>발권하기</span>
        <span className="paper-ticket__arrow" aria-hidden="true">
          →
        </span>
      </button>
      <p className="landing__help">
        참가 신청에 사용한 이메일을 준비해주세요.
        <br />
        발급받은 탑승권도 다시 확인할 수 있어요.
      </p>
    </PaperTicket>
  )
}
