import { useMemo } from 'react'
import { BoardingPassTearLayer } from './BoardingPass'
import type { DepartureResult } from './DepartureReveal'
import { ticketPaperStrip } from '../hooks/ticketTear'

const STRIPS = 28

/** Each band uses the same boundary curve, so printed letters stay connected. */
export function TicketPaperMesh({
  result,
  height,
  progress,
  pullX,
  pullY,
}: {
  result: DepartureResult
  height: number
  progress: number
  pullX: number
  pullY: number
}) {
  const paper = useMemo(
    () => <BoardingPassTearLayer result={result} />,
    [result],
  )
  return (
    <div className="ticket-presentation__mesh" aria-hidden="true">
      {Array.from({ length: STRIPS }, (_, index) => (
        <div
          key={index}
          className="ticket-presentation__paper-strip"
          style={{
            clipPath: `inset(calc(${(index / STRIPS) * 100}% - 1px) 0 calc(${(1 - (index + 1) / STRIPS) * 100}% - 1px) calc(72% - 1px))`,
            transform: `matrix(${ticketPaperStrip(index, STRIPS, height, progress, pullX, pullY).join(',')})`,
          }}
        >
          {paper}
        </div>
      ))}
    </div>
  )
}
