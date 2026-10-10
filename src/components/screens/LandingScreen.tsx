import { contactUrl, primaryButtonClass } from './InputScreen'
export interface LandingScreenProps {
  onStart: () => void
  disabled?: boolean
}
export function LandingScreen({
  onStart,
  disabled = false,
}: LandingScreenProps) {
  return (
    <section
      className="flex min-h-[calc(100svh-3rem)] w-full min-w-0 flex-col py-8"
      aria-labelledby="landing-title"
    >
      <div className="my-auto py-8">
        <h1
          id="landing-title"
          tabIndex={-1}
          className="font-mono text-display leading-tight font-semibold"
        >
          GDG
          <br />
          HOME COMING
        </h1>
        <p className="mt-6 text-body">
          다시 만나는 우리,
          <br />
          이번엔 어디로 떠날까요?
        </p>
        <p className="mt-3 text-caption text-muted">
          나만의 여행지를 뽑고, 홈커밍 탑승권을 받아보세요.
        </p>
        <dl className="mt-10 border-y border-board-seam py-5 text-body">
          <div className="flex gap-5">
            <dt className="w-10 shrink-0 text-muted">일시</dt>
            <dd>
              <time dateTime="2026-11-21T15:00:00+09:00">2026.11.21 15:00</time>
              <br />
              <span className="text-muted">— </span>
              <time dateTime="2026-11-22T04:00:00+09:00">11.22 04:00</time>
            </dd>
          </div>
          <div className="mt-4 flex gap-5">
            <dt className="w-10 shrink-0 text-muted">장소</dt>
            <dd>성수 그린힐드</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onStart}
          disabled={disabled}
          className={`${primaryButtonClass} mt-8`}
        >
          발권하기
        </button>
        <p className="mt-3 text-caption text-muted">
          참가 신청에 사용한 이메일을 준비해주세요.
          <br />
          발급받은 탑승권도 다시 확인할 수 있어요.
        </p>
      </div>
      <footer className="mt-6 pb-[env(safe-area-inset-bottom)] text-center">
        <a
          href={contactUrl}
          className="inline-flex min-h-touch items-center text-caption text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          문의하기
        </a>
      </footer>
    </section>
  )
}
