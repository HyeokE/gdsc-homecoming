import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { BoardingPass, BoardingPassStub } from '../../BoardingPass';
import type { DepartureResult } from '../../../types/departure';
import { ticketTearEdge, ticketTearProgress } from './ticketTear';
import { TicketPaperMesh } from './TicketPaperMesh';
import './ticket-presentation.css';

export interface TicketPresentationProps {
  open: boolean;
  result: DepartureResult;
  onClose: () => void;
  onContinue?: () => void;
  reducedMotion?: boolean;
}

export function TicketPresentation(props: TicketPresentationProps) {
  return props.open ? <TicketPickup {...props} /> : null;
}

function TicketPickup({ result, onClose, onContinue, reducedMotion = false }: TicketPresentationProps) {
  const [phase, setPhase] = useState<'notice' | 'released' | 'detail'>('notice');
  const [progress, setProgress] = useState(0);
  const [pull, setPull] = useState({ x: 0, y: 0 });
  const [paperSize, setPaperSize] = useState({ height: 1, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    width: number;
    progress: number;
  } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<HTMLButtonElement>(null);
  const returnFrame = useRef<number | null>(null);
  const completed = useRef(false);
  const continueRef = useRef(onContinue);
  useEffect(() => {
    continueRef.current = onContinue;
  }, [onContinue]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    grabRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    return () => {
      stopReturnAnimation();
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const ticket = ticketRef.current;
    if (!stage || !ticket) {
      return;
    }
    const fit = () => {
      const scale = Math.min(1, stage.clientHeight / ticket.offsetHeight);
      ticket.style.setProperty('--ticket-presentation-scale', String(scale));
      setPaperSize((previous) =>
        previous.height === ticket.offsetHeight && previous.scale === scale
          ? previous
          : { height: ticket.offsetHeight, scale },
      );
    };
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    observer.observe(ticket);
    fit();
    return () => observer.disconnect();
  }, [phase]);

  useEffect(() => {
    if (phase !== 'released') {
      return;
    }
    const reduce = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(
      () => {
        if (completed.current) {
          return;
        }
        completed.current = true;
        const navigate = () => {
          if (continueRef.current) {
            continueRef.current();
          } else {
            setPhase('detail');
          }
        };
        if (!reduce && document.startViewTransition) {
          const transition = document.startViewTransition(async () => {
            navigate();
            // View transitions freeze rendering while this callback runs; waiting
            // for animation frames here can deadlock the snapshot. Let the router
            // commit in the next task instead.
            await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
          });
          // Unsupported snapshots must never interrupt receiving the saved ticket.
          void transition.ready.catch(() => undefined);
          void transition.finished.catch(() => undefined);
        } else {
          navigate();
        }
      },
      reduce ? 100 : 380,
    );
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion]);

  useEffect(() => {
    const resetOnResize = () => {
      if (!drag.current && returnFrame.current === null) {
        return;
      }
      stopReturnAnimation();
      drag.current = null;
      setDragging(false);
      setProgress(0);
      setPull({ x: 0, y: 0 });
    };
    window.addEventListener('resize', resetOnResize);
    return () => window.removeEventListener('resize', resetOnResize);
  }, []);

  function stopReturnAnimation() {
    if (returnFrame.current !== null) {
      cancelAnimationFrame(returnFrame.current);
    }
    returnFrame.current = null;
  }
  function release() {
    stopReturnAnimation();
    drag.current = null;
    setDragging(false);
    setProgress(1);
    setPhase('released');
  }
  function cancelDrag() {
    drag.current = null;
    setDragging(false);
    stopReturnAnimation();
    const start = performance.now();
    const reduce = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const relax = (now: number) => {
      const remaining = reduce ? 0 : Math.max(0, 1 - (now - start) / 220) ** 3;
      setProgress(progress * remaining);
      setPull({ x: pull.x * remaining, y: pull.y * remaining });
      returnFrame.current = remaining > 0 ? requestAnimationFrame(relax) : null;
    };
    returnFrame.current = requestAnimationFrame(relax);
  }
  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (
      phase !== 'notice' ||
      !event.isPrimary ||
      drag.current ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return;
    }
    stopReturnAnimation();
    setProgress(0);
    setPull({ x: 0, y: 0 });
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      width: event.currentTarget.getBoundingClientRect().width,
      progress: 0,
    };
    setDragging(true);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) {
      return;
    }
    current.progress = ticketTearProgress(event.clientX - current.x, event.clientY - current.y, current.width);
    setProgress(current.progress);
    setPull({
      x: (event.clientX - current.x) / paperSize.scale,
      y: (event.clientY - current.y) / paperSize.scale,
    });
  }
  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) {
      return;
    }
    // Use the final pointer position as touch devices may coalesce the last move.
    const finalProgress = ticketTearProgress(event.clientX - current.x, event.clientY - current.y, current.width);
    if (finalProgress >= 1) {
      release();
    } else {
      cancelDrag();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="ticket-presentation"
      aria-label={phase === 'detail' ? '탑승권 상세' : '탑승권 받기'}
      data-phase={phase}
      data-dragging={dragging || undefined}
      data-reduced-motion={reducedMotion || undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="ticket-presentation__layout">
        <header className="ticket-presentation__header">
          <div className="ticket-presentation__notice" role="status">
            {phase === 'notice' && <span id="ticket-tear-help">절취선 위쪽을 잡고 오른쪽 아래로 당겨주세요.</span>}
            {phase === 'released' && <span className="sr-only">탑승권을 받았어요. 상세 화면으로 이동합니다.</span>}
            {phase === 'detail' && <strong>당신의 탑승권</strong>}
          </div>
          <button type="button" className="ticket-presentation__close" onClick={onClose}>
            닫기
          </button>
        </header>
        <div ref={stageRef} className="ticket-presentation__stage">
          {phase === 'detail' ? (
            <div className="ticket-presentation__detached">
              <BoardingPassStub result={result} />
            </div>
          ) : (
            <div
              ref={ticketRef}
              className="ticket-presentation__ticket"
              data-bent={progress > 0 || undefined}
              style={
                {
                  '--tear-progress': progress,
                  '--tear-edge': ticketTearEdge(progress),
                } as CSSProperties
              }
            >
              <BoardingPass result={result} displayMode="expanded" />
              <TicketPaperMesh
                result={result}
                height={paperSize.height}
                progress={progress}
                pullX={pull.x}
                pullY={pull.y}
              />
              {phase === 'notice' && (
                <button
                  ref={grabRef}
                  className="ticket-presentation__grab"
                  type="button"
                  aria-label="오른쪽 탑승권 뜯기"
                  aria-describedby="ticket-tear-help ticket-tear-keyboard"
                  onPointerDown={startDrag}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={(event) => {
                    if (drag.current?.id === event.pointerId) {
                      cancelDrag();
                    }
                  }}
                  onLostPointerCapture={(event) => {
                    if (drag.current?.id === event.pointerId) {
                      cancelDrag();
                    }
                  }}
                  onClick={(event) => {
                    if (event.detail === 0) {
                      release();
                    }
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
                      event.preventDefault();
                      release();
                    }
                  }}
                >
                  <span className="ticket-presentation__perforation" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
        <footer className="ticket-presentation__footer">
          {phase === 'notice' && (
            <p className="ticket-presentation__pull-hint" role="status">
              {dragging
                ? progress >= 1
                  ? '놓으면 탑승권을 받을 수 있어요'
                  : '조금 더 당겨주세요'
                : '절취선 위쪽을 잡아 당겨보세요'}
            </p>
          )}
          <p id="ticket-tear-keyboard" className="sr-only">
            키보드는 Enter 또는 스페이스 키로 탑승권을 받을 수 있어요.
          </p>
        </footer>
      </div>
    </dialog>
  );
}
