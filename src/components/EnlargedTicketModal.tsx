import { BoardingPassStub } from './BoardingPass'
import type { DepartureResult } from './DepartureReveal'
import { Modal } from './Modal'
export interface EnlargedTicketModalProps {
  open: boolean
  result: DepartureResult
  onClose: () => void
}
export function EnlargedTicketModal({
  open,
  result,
  onClose,
}: EnlargedTicketModalProps) {
  return (
    <Modal open={open} title="탑승권 크게 보기" onClose={onClose}>
      <div className="ticket-stub-enlarged">
        <BoardingPassStub result={result} exportMode />
      </div>
      <dl className="mt-5 text-body">
        <div>
          <dt className="text-caption text-muted">승객</dt>
          <dd className="wrap-anywhere">{result.passengerName}</dd>
        </div>
        <div className="mt-3">
          <dt className="text-caption text-muted">목적지</dt>
          <dd>
            {result.countryLabel ?? result.country} · {result.city} (
            {result.airportCode})
          </dd>
        </div>
        <div className="mt-3">
          <dt className="text-caption text-muted">게이트</dt>
          <dd>{result.gate}</dd>
        </div>
      </dl>
    </Modal>
  )
}
