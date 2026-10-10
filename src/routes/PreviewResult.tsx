import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BoardingPassStub } from '../components/BoardingPass'
import { departurePreview } from '../fixtures/departurePreview'
import { getDestination } from '../data/destinations'
import { saveTicketImage } from '../services/saveTicketImage'
import { PREVIEW_RESULT_ID, PREVIEW_RESULT_PATH } from './previewResultRoute'
import { EnlargedTicketModal } from '../components/EnlargedTicketModal'
import '../styles/ticket-detail.css'

export { PREVIEW_RESULT_PATH }

export function PreviewResult() {
  const ref = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle',
  )
  const saving = useRef(false)
  const [enlarged, setEnlarged] = useState(false)
  const destination = getDestination('jp')
  async function save() {
    if (!ref.current || saving.current) return
    saving.current = true
    setStatus('saving')
    try {
      await saveTicketImage(ref.current, PREVIEW_RESULT_ID)
      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      saving.current = false
    }
  }
  return (
    <main className="min-h-svh w-full bg-black px-page py-8 text-foreground">
      <section className="ticket-detail mx-auto w-full max-w-mobile">
        <h1 className="sr-only" tabIndex={-1}>
          당신의 탑승권
        </h1>
        <div ref={ref} className="ticket-detail-screen__stub">
          <BoardingPassStub result={departurePreview} />
        </div>
        <div className="ticket-detail__actions">
          <button
            type="button"
            className="ticket-detail__button ticket-detail__button--save"
            onClick={() => void save()}
            disabled={status === 'saving'}
            aria-busy={status === 'saving'}
          >
            {status === 'saving'
              ? '이미지 준비 중…'
              : status === 'error'
                ? '저장 다시 시도'
                : '이미지 저장'}
          </button>
          <button
            type="button"
            className="ticket-detail__button"
            onClick={() => setEnlarged(true)}
          >
            크게 보기
          </button>
        </div>
        <p
          className={`ticket-detail__save-note ${status === 'error' ? 'ticket-detail__error' : ''}`}
          role={status === 'error' ? 'alert' : 'status'}
        >
          {status === 'error'
            ? '이미지를 준비하지 못했어요. 다시 시도해주세요.'
            : status === 'success'
              ? '이미지 다운로드를 요청했어요.'
              : '미리보기 탑승권이에요.'}
        </p>
        <section className="ticket-detail__section ticket-detail__destination">
          <h2 className="ticket-detail__heading">
            {destination.name}에서 시작하는 여행
          </h2>
          <p className="ticket-detail__description">
            {destination.introduction}
          </p>
          <ul className="ticket-detail__keywords">
            {destination.keywords.map((word) => (
              <li key={word}>{word}</li>
            ))}
          </ul>
        </section>
        <Link className="ticket-detail__preview-link" to="/preview/departure">
          발권 미리보기 다시 보기
        </Link>
      </section>
      <EnlargedTicketModal
        open={enlarged}
        result={departurePreview}
        onClose={() => setEnlarged(false)}
      />
    </main>
  )
}
