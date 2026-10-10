import { useEffect, useId, useRef } from 'react';
import { toCanvas } from 'html-to-image';
import { BoardingPass } from '../BoardingPass';
import { BoardingPassBack } from './BoardingPassBack';
import type { DepartureResult } from '../../types/departure';
import { createPaperRenderer } from './paperRenderer';
import type { PaperPose } from './paperRenderer';
import './ticket-viewer.css';

export interface EnlargedTicketModalProps {
  open: boolean;
  result: DepartureResult;
  onClose: () => void;
}

const POSE_KEYS = ['tiltX', 'tiltY', 'bendX', 'bendY', 'lift', 'grabX', 'grabY'] as const;
const REST_POSE: PaperPose = { tiltX: -5, tiltY: -7, bendX: 0, bendY: 0, grabX: 0, grabY: 0, lift: 0, roll: 0 };
const clamp = (value: number, maximum: number) => Math.max(-maximum, Math.min(maximum, value));

export function EnlargedTicketModal({ open, result, onClose }: EnlargedTicketModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const backPrintRef = useRef<HTMLDivElement>(null);
  const hintId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const stage = stageRef.current;
    const paper = paperRef.current;
    const canvas = canvasRef.current;
    const print = printRef.current;
    const backPrint = backPrintRef.current;
    if (!open || !dialog || !stage || !paper || !canvas || !print || !backPrint) {
      return;
    }
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let renderer: ReturnType<typeof createPaperRenderer> = null;
    let texture: HTMLCanvasElement | null = null;
    let backTexture: HTMLCanvasElement | null = null;
    let disposed = false;
    let frame = 0;
    let lastTime = 0;
    let width = 1;
    let height = 1;
    let paperWidth = 1;
    let paperHeight = 1;
    let roll = 0;
    let pointer: { id: number; x: number; y: number; tiltX: number; tiltY: number } | null = null;
    let current = { ...REST_POSE };
    let target = { ...REST_POSE };
    const velocity = { tiltX: 0, tiltY: 0, bendX: 0, bendY: 0, lift: 0, grabX: 0, grabY: 0 };

    function draw() {
      current.roll = roll;
      renderer?.render({ width, height, paperWidth, paperHeight, pose: current });
      // The readable full ticket remains available before capture and without WebGL.
      stage!.style.setProperty('--viewer-fit', String(paperWidth / 1000));
      stage!.style.setProperty('--viewer-roll', `${roll}deg`);
      stage!.style.setProperty('--viewer-tilt-x', `${current.tiltX}deg`);
      stage!.style.setProperty('--viewer-tilt-y', `${current.tiltY}deg`);
    }

    function tick(time: number) {
      frame = 0;
      const dt = Math.min((time - (lastTime || time - 16)) / 1000, 1 / 30);
      lastTime = time;
      let moving = false;
      for (const key of POSE_KEYS) {
        if (motion.matches) {
          current[key] = target[key];
          velocity[key] = 0;
          continue;
        }
        // Near-critical damping gives paper weight without an endless wobble.
        velocity[key] += ((target[key] - current[key]) * 240 - velocity[key] * 30) * dt;
        current[key] += velocity[key] * dt;
        const tolerance = key.startsWith('bend') || key.startsWith('grab') ? 0.0005 : 0.015;
        if (Math.abs(target[key] - current[key]) > tolerance || Math.abs(velocity[key]) > tolerance) {
          moving = true;
        } else {
          current[key] = target[key];
          velocity[key] = 0;
        }
      }
      draw();
      if (moving && !disposed) {
        frame = requestAnimationFrame(tick);
      }
    }

    function wake() {
      if (!frame && !disposed) {
        lastTime = 0;
        frame = requestAnimationFrame(tick);
      }
    }

    function release() {
      const id = pointer?.id;
      pointer = null;
      delete paper!.dataset.dragging;
      if (id !== undefined && paper!.hasPointerCapture(id)) {
        paper!.releasePointerCapture(id);
      }
      target = { ...target, bendX: 0, bendY: 0, lift: 0 };
      wake();
    }

    function reset() {
      release();
      target = { ...REST_POSE, grabX: current.grabX, grabY: current.grabY, roll };
      if (motion.matches) {
        target.tiltX = 0;
        target.tiltY = 0;
      }
      wake();
    }

    function resize() {
      width = stage!.clientWidth;
      height = stage!.clientHeight;
      const nextRoll = height > width * 1.15 ? 90 : 0;
      if (nextRoll !== roll) {
        release();
      }
      roll = nextRoll;
      const aspect = (texture?.height ?? print!.offsetHeight) / (texture?.width ?? 1000);
      const availableWidth = roll ? height : width;
      const availableHeight = roll ? width : height;
      paperWidth = Math.min(1200, availableWidth / 1.12, availableHeight / (aspect * 1.15));
      paperHeight = paperWidth * aspect;
      draw();
    }

    function localPoint(x: number, y: number) {
      return roll ? { x: y, y: -x } : { x, y };
    }

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!event.isPrimary || event.button !== 0 || pointer) {
        return;
      }
      paper!.focus({ preventScroll: true });
      paper!.setPointerCapture(event.pointerId);
      paper!.dataset.dragging = 'true';
      const rect = stage!.getBoundingClientRect();
      const point = localPoint(event.clientX - rect.left - width / 2, event.clientY - rect.top - height / 2);
      target.grabX = clamp(point.x / (paperWidth / 2), 1);
      target.grabY = clamp(point.y / (paperHeight / 2), 1);
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, tiltX: current.tiltX, tiltY: current.tiltY };
      target.tiltX = current.tiltX;
      target.tiltY = current.tiltY;
      velocity.tiltX = 0;
      velocity.tiltY = 0;
      target.lift = motion.matches ? 0 : 12;
      wake();
    }

    function handlePointerMove(event: globalThis.PointerEvent) {
      if (pointer?.id !== event.pointerId) {
        return;
      }
      const delta = localPoint(event.clientX - pointer.x, event.clientY - pointer.y);
      const x = delta.x / Math.max(1, paperWidth);
      const y = delta.y / Math.max(1, paperHeight);
      target.tiltX = pointer.tiltX - y * 360;
      target.tiltY = pointer.tiltY + x * 360;
      target.bendX = motion.matches ? 0 : clamp(x * 2.8 + y * current.grabX * 1.1, 0.95);
      target.bendY = motion.matches ? 0 : clamp(y * 1.8 + x * current.grabY * 0.6, 0.7);
      target.lift = motion.matches ? 0 : Math.min(32, 12 + Math.hypot(delta.x, delta.y) * 0.08);
      wake();
    }

    function handlePointerEnd(event: globalThis.PointerEvent) {
      if (pointer?.id === event.pointerId) {
        release();
      }
    }

    function handleKey(event: globalThis.KeyboardEvent) {
      const direction = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
      if (event.key === 'Home') {
        event.preventDefault();
        reset();
      } else if (direction) {
        event.preventDefault();
        const delta = localPoint(direction[0], direction[1]);
        target.grabX = delta.x;
        target.grabY = delta.y;
        target.tiltX -= delta.y * 15;
        target.tiltY += delta.x * 15;
        target.bendX = motion.matches ? 0 : clamp(target.bendX + delta.x * 0.18, 0.75);
        target.bendY = motion.matches ? 0 : clamp(target.bendY + delta.y * 0.14, 0.55);
        wake();
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        release();
        cancelAnimationFrame(frame);
        frame = 0;
        current = { ...target };
        draw();
      }
    }

    function handleContextLost(event: Event) {
      event.preventDefault();
      renderer = null;
      delete stage!.dataset.rendered;
    }

    function handleContextRestored() {
      if (!disposed && texture) {
        renderer = createPaperRenderer(canvas!, texture, backTexture ?? undefined);
        if (renderer) {
          stage!.dataset.rendered = 'true';
        }
        resize();
      }
    }

    if (!dialog.open) {
      dialog.showModal();
    }
    document.body.style.overflow = 'hidden';
    paper.focus({ preventScroll: true });
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    observer.observe(print);
    reset();
    resize();
    paper.addEventListener('pointerdown', handlePointerDown);
    paper.addEventListener('pointermove', handlePointerMove);
    paper.addEventListener('pointerup', handlePointerEnd);
    paper.addEventListener('pointercancel', handlePointerEnd);
    paper.addEventListener('lostpointercapture', handlePointerEnd);
    paper.addEventListener('keydown', handleKey);
    paper.addEventListener('dblclick', reset);
    window.addEventListener('blur', release);
    motion.addEventListener('change', release);
    document.addEventListener('visibilitychange', handleVisibility);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    void (async () => {
      try {
        await document.fonts.ready;
        if (disposed) {
          return;
        }
        const backgroundColor = getComputedStyle(print).getPropertyValue('--ui-ticket').trim();
        const [captured, capturedBack] = await Promise.all([
          toCanvas(print, { pixelRatio: 2, backgroundColor }),
          toCanvas(backPrint, { pixelRatio: 2, backgroundColor }),
        ]);
        if (disposed) {
          return;
        }
        texture = captured;
        backTexture = capturedBack;
        handleContextRestored();
      } catch {
        // Keep the complete, readable DOM ticket if texture capture is unavailable.
        if (!disposed) {
          delete stage.dataset.rendered;
        }
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      const capturedPointer = pointer?.id;
      pointer = null;
      if (capturedPointer !== undefined && paper.hasPointerCapture(capturedPointer)) {
        paper.releasePointerCapture(capturedPointer);
      }
      observer.disconnect();
      renderer?.dispose();
      delete stage.dataset.rendered;
      delete paper.dataset.dragging;
      paper.removeEventListener('pointerdown', handlePointerDown);
      paper.removeEventListener('pointermove', handlePointerMove);
      paper.removeEventListener('pointerup', handlePointerEnd);
      paper.removeEventListener('pointercancel', handlePointerEnd);
      paper.removeEventListener('lostpointercapture', handlePointerEnd);
      paper.removeEventListener('keydown', handleKey);
      paper.removeEventListener('dblclick', reset);
      window.removeEventListener('blur', release);
      motion.removeEventListener('change', release);
      document.removeEventListener('visibilitychange', handleVisibility);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open, result]);

  return (
    <dialog
      ref={dialogRef}
      className="ticket-viewer"
      aria-label="전체 탑승권 3D 보기"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="ticket-viewer__layout">
        <header className="ticket-viewer__header">
          <span className="ticket-viewer__eyebrow">YOUR BOARDING PASS</span>
          <button type="button" className="ticket-viewer__close" onClick={onClose}>
            닫기
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div ref={stageRef} className="ticket-viewer__stage">
          {/* Custom two-axis paper control provides pointer capture, arrow keys and Home. */}
          {/* eslint-disable jsx-a11y/no-noninteractive-tabindex */}
          <div
            ref={paperRef}
            className="ticket-viewer__paper"
            tabIndex={0}
            role="application"
            aria-label={`${result.passengerName}님의 전체 탑승권. 잡고 드래그해서 앞뒷면 돌려보기`}
            aria-describedby={hintId}
            aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home"
          >
            <div className="ticket-viewer__fallback">
              <div ref={printRef} className="ticket-viewer__print">
                <BoardingPass result={result} exportMode displayMode="expanded" />
              </div>
              <div className="ticket-viewer__back" aria-hidden="true">
                <div ref={backPrintRef} className="ticket-viewer__back-print">
                  <BoardingPassBack result={result} />
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="ticket-viewer__canvas" aria-hidden="true" />
          </div>
          {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
        </div>
        <p id={hintId} className="ticket-viewer__hint">
          티켓을 잡고 돌려보세요 · 두 번 누르면 원래대로
          <span className="sr-only">. 방향키로 앞뒷면을 돌려볼 수 있어요. Home 키로 앞면으로 돌아갑니다.</span>
        </p>
      </div>
    </dialog>
  );
}
