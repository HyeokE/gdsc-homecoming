import { useEffect, useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { BoardingPassStub } from './BoardingPass';
import type { DepartureResult } from '../types/departure';
import '../styles/ticket-viewer.css';

export interface EnlargedTicketModalProps {
  open: boolean;
  result: DepartureResult;
  onClose: () => void;
}

type Rotation = { x: number; y: number };
type Drag = Rotation & { pointerId: number; startX: number; startY: number };
const limit = (angle: number) => Math.max(-28, Math.min(28, angle));

export function EnlargedTicketModal({ open, result, onClose }: EnlargedTicketModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const rotation = useRef<Rotation>({ x: -5, y: -9 });
  const drag = useRef<Drag | null>(null);
  const hintId = useId();

  function rotate(next: Rotation) {
    rotation.current = { x: limit(next.x), y: limit(next.y) };
    const paper = paperRef.current;
    if (!paper) {
      return;
    }
    paper.style.setProperty('--ticket-viewer-x', `${rotation.current.x}deg`);
    paper.style.setProperty('--ticket-viewer-y', `${rotation.current.y}deg`);
    paper.style.setProperty('--ticket-viewer-light-x', `${50 - rotation.current.y}%`);
    paper.style.setProperty('--ticket-viewer-light-y', `${40 + rotation.current.x}%`);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    const paper = paperRef.current;
    if (!open || !dialog || !stage || !frame || !paper) {
      return;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    rotate(media.matches ? { x: 0, y: 0 } : { x: -5, y: -9 });
    if (!dialog.open) {
      dialog.showModal();
    }
    document.body.style.overflow = 'hidden';
    paper.focus({ preventScroll: true });

    const observer = new ResizeObserver(() => {
      // Leave room for the perspective projection at the maximum drag angle.
      const scale = Math.min(
        1,
        stage.clientHeight / (paper.offsetHeight * 1.12),
        stage.clientWidth / (paper.offsetWidth * 1.12),
      );
      frame.style.setProperty('--ticket-viewer-fit', String(scale));
    });
    observer.observe(stage);
    observer.observe(paper);
    return () => {
      observer.disconnect();
      drag.current = null;
      delete paper.dataset.dragging;
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = 'true';
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      ...rotation.current,
    };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }
    rotate({
      x: current.x - (event.clientY - current.startY) * 0.18,
      y: current.y + (event.clientX - current.startX) * 0.18,
    });
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) {
      return;
    }
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const current = rotation.current;
    const next = {
      ArrowUp: { ...current, x: current.x + 5 },
      ArrowDown: { ...current, x: current.x - 5 },
      ArrowLeft: { ...current, y: current.y - 5 },
      ArrowRight: { ...current, y: current.y + 5 },
      Home: { x: 0, y: 0 },
    }[event.key];
    if (!next) {
      return;
    }
    event.preventDefault();
    rotate(next);
  }

  return (
    <dialog
      ref={dialogRef}
      className="ticket-viewer"
      aria-label="탑승권 3D 보기"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="ticket-viewer__layout">
        <header className="ticket-viewer__header">
          <button type="button" className="ticket-viewer__close" onClick={onClose}>
            닫기
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div ref={stageRef} className="ticket-viewer__stage">
          <div ref={frameRef} className="ticket-viewer__frame">
            {/* Two-axis paper manipulation is a custom keyboard application, not a single-value slider. */}
            {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
            <div
              ref={paperRef}
              className="ticket-viewer__paper"
              tabIndex={0}
              role="application"
              aria-label={`${result.passengerName}님의 탑승권. 드래그하거나 방향키로 기울이기`}
              aria-describedby={hintId}
              aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home"
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              onLostPointerCapture={finishDrag}
              onKeyDown={handleKey}
              onDoubleClick={() => rotate({ x: 0, y: 0 })}
            >
              <div className="ticket-viewer__face">
                <BoardingPassStub result={result} exportMode />
              </div>
            </div>
            {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
          </div>
        </div>
        <p id={hintId} className="ticket-viewer__hint">
          드래그해서 티켓을 둘러보세요
          <span className="sr-only">. 방향키로 기울이고 Home 키로 정면으로 돌릴 수 있어요.</span>
        </p>
      </div>
    </dialog>
  );
}
