import { useId } from 'react'
import type { FormEvent } from 'react'

export type InputScreenStatus = 'idle' | 'loading' | 'checking-result'
export interface InputScreenError {
  kind: 'field' | 'not-found' | 'connection' | 'restore' | 'uncertain'
  message: string
}
export interface InputScreenProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
  status?: InputScreenStatus
  error?: InputScreenError
  disabled?: boolean
}

export const primaryButtonClass =
  'min-h-control w-full rounded-control bg-primary px-5 py-3 text-body font-semibold text-on-primary transition-colors duration-feedback ease-ui hover:bg-primary-hover active:bg-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:bg-disabled disabled:text-on-disabled disabled:hover:bg-disabled'
export const secondaryButtonClass =
  'min-h-control rounded-control border border-border bg-transparent px-4 py-3 text-body font-semibold text-foreground transition-colors duration-feedback hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:text-on-disabled'
export const contactUrl = 'https://open.kakao.com/o/gvuQCBRi'

interface InputScreenViewProps extends InputScreenProps {
  kind: 'email' | 'nickname'
  demoEmail?: string
}
export function InputScreen({
  kind,
  value,
  onChange,
  onSubmit,
  onBack,
  status = 'idle',
  error,
  disabled = false,
  demoEmail,
}: InputScreenViewProps) {
  const id = useId()
  const busy = status !== 'idle'
  const email = kind === 'email'
  const fieldError = error?.kind === 'field' || error?.kind === 'not-found'
  const message =
    error?.kind === 'not-found'
      ? '신청 내역을 찾을 수 없어요. 이메일을 다시 확인해주세요.'
      : error?.message
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy && !disabled) onSubmit()
  }
  return (
    <section className="w-full min-w-0 py-4" aria-labelledby={`${id}-title`}>
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="mb-8 min-h-touch min-w-touch text-body text-muted underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        뒤로 가기
      </button>
      <h1
        id={`${id}-title`}
        tabIndex={-1}
        className="text-title font-semibold tracking-tight"
      >
        {email ? '신청한 이메일을 입력해주세요' : '닉네임을 입력해주세요.'}
      </h1>
      <p id={`${id}-help`} className="mt-4 text-body text-muted">
        {email
          ? '참가 신청에 사용한 이메일로 발권할 수 있어요.'
          : '(닉네임 + 성 조합)'}
      </p>
      {demoEmail && (
        <p className="mt-3 text-caption text-muted">
          데모 이메일: <span className="wrap-anywhere">{demoEmail}</span>
        </p>
      )}
      <form className="mt-10" onSubmit={submit} noValidate aria-busy={busy}>
        <label
          htmlFor={`${id}-input`}
          className="mb-3 block text-caption font-semibold"
        >
          {email ? '신청한 이메일' : '닉네임 + 성'}
        </label>
        <input
          id={`${id}-input`}
          type={email ? 'email' : 'text'}
          inputMode={email ? 'email' : 'text'}
          autoComplete={email ? 'email' : 'nickname'}
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          readOnly={busy}
          disabled={disabled}
          aria-invalid={fieldError || undefined}
          aria-describedby={`${id}-help${message ? ` ${id}-error` : ''}`}
          placeholder={email ? 'name@example.com' : 'JASON JEONG'}
          className="min-h-control w-full min-w-0 rounded-control border border-border bg-surface px-4 py-3 text-body text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:text-on-disabled aria-invalid:border-error"
        />
        {message && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-3 text-caption text-error"
          >
            {message}
          </p>
        )}
        {error?.kind === 'not-found' && (
          <a
            href={contactUrl}
            className="mt-3 inline-flex min-h-touch items-center text-caption text-link underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            문의하기
          </a>
        )}
        <button
          type="submit"
          disabled={disabled || busy}
          className={`${primaryButtonClass} mt-8`}
        >
          {busy
            ? status === 'checking-result'
              ? '발급 결과 확인 중…'
              : email
                ? '확인 중…'
                : '탑승권 준비 중…'
            : error && !fieldError
              ? '다시 시도'
              : email
                ? '확인하기'
                : '발권하기'}
        </button>
        <p
          role="status"
          aria-live="polite"
          className="mt-3 min-h-6 text-caption text-muted"
        >
          {status === 'checking-result'
            ? '저장된 결과를 확인하고 있어요. 잠시 기다려주세요.'
            : busy
              ? '잠시 기다려주세요.'
              : '\u00a0'}
        </p>
      </form>
    </section>
  )
}
