import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { toCanvas } from 'html-to-image';
import type { MotionValue } from 'motion/react';
import { flightPaperFlex, stepPaperInertia } from './flightPaperMath';
import { createPaperRenderer } from './flightPaperRenderer';
import './styles/flight-paper.css';

interface FlightPaperProps {
  children: ReactNode;
  progress: MotionValue<number>;
  lateral?: MotionValue<number>;
  reducedMotion: boolean;
}

/** One accessible original and one GPU surface; capture happens only after layout changes. */
export function FlightPaper({ children, progress, lateral, reducedMotion }: FlightPaperProps) {
  const paperRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const paper = paperRef.current;
    const source = sourceRef.current;
    const canvas = canvasRef.current;
    if (!paper || !source || !canvas || reducedMotion) {
      return;
    }
    const renderer = createPaperRenderer(canvas);
    if (!renderer) {
      return;
    }

    let isVisible = false;
    let isReady = false;
    let isDisposed = false;
    let isContextLost = false;
    let frameId = 0;
    let captureTimer = 0;
    let revision = 0;
    let captured = 0;
    let measuredWidth = 0;
    let measuredHeight = 0;
    let previousTime = 0;
    let windTime = 0;
    let windDirection = 0;
    let inertia = { position: 0, velocity: 0, lateral: lateral?.get() ?? 0, lateralVelocity: 0 };

    const canAnimate = () =>
      isReady && isVisible && !document.hidden && !isDisposed && !isContextLost && flightPaperFlex(progress.get()) > 0;

    function stop() {
      cancelAnimationFrame(frameId);
      frameId = 0;
      delete paper!.dataset.flexing;
    }

    function animate(now: number) {
      if (!canAnimate()) {
        stop();
        return;
      }
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - previousTime) / 1000));
      previousTime = now;
      windTime += dt;
      inertia = stepPaperInertia(inertia, lateral?.get() ?? 0, dt);
      windDirection += (inertia.lateralVelocity - windDirection) * (1 - Math.exp(-3 * dt));
      renderer!.draw(windTime, flightPaperFlex(progress.get()), inertia.position, windDirection);
      if (!paper!.dataset.flexing) {
        paper!.dataset.flexing = 'true';
      }
      frameId = requestAnimationFrame(animate);
    }

    function synchronize() {
      if (!canAnimate()) {
        stop();
      } else if (!frameId) {
        inertia = { ...inertia, lateral: lateral?.get() ?? 0, lateralVelocity: 0 };
        previousTime = performance.now();
        frameId = requestAnimationFrame(animate);
      }
    }

    async function capture(currentRevision: number) {
      try {
        await document.fonts.ready;
        if (isDisposed || isContextLost || currentRevision !== revision) {
          return;
        }
        const width = source!.offsetWidth;
        const height = source!.offsetHeight;
        if (!width || !height) {
          return;
        }
        const texture = await toCanvas(source!, {
          width,
          height,
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          preferredFontFormat: 'woff2',
          style: { opacity: '1' },
        });
        if (isDisposed || isContextLost || currentRevision !== revision) {
          return;
        }
        renderer!.setTexture(texture, width, height);
        isReady = true;
        captured += 1;
        paper!.dataset.renderer = 'webgl';
        paper!.dataset.captures = String(captured);
        synchronize();
      } catch {
        // Font/image export or GPU upload can fail; keep the real ticket visible.
        if (!isDisposed && currentRevision === revision) {
          isReady = false;
          stop();
        }
      }
    }

    function scheduleCapture() {
      if (isDisposed || isContextLost) {
        return;
      }
      revision += 1;
      isReady = false;
      stop();
      window.clearTimeout(captureTimer);
      const currentRevision = revision;
      captureTimer = window.setTimeout(() => void capture(currentRevision), 120);
    }

    const resizeObserver = new ResizeObserver(() => {
      const width = source.offsetWidth;
      const height = source.offsetHeight;
      if (width !== measuredWidth || height !== measuredHeight) {
        measuredWidth = width;
        measuredHeight = height;
        scheduleCapture();
      }
    });
    const mutationObserver = new MutationObserver(scheduleCapture);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      synchronize();
    });
    const handleContextLost = () => {
      isContextLost = true;
      isReady = false;
      revision += 1;
      window.clearTimeout(captureTimer);
      stop();
      delete paper.dataset.renderer;
    };
    resizeObserver.observe(source);
    mutationObserver.observe(source, { childList: true, characterData: true, subtree: true });
    intersectionObserver.observe(paper);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    document.addEventListener('visibilitychange', synchronize);
    const unsubscribe = progress.on('change', synchronize);

    return () => {
      isDisposed = true;
      revision += 1;
      stop();
      window.clearTimeout(captureTimer);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      document.removeEventListener('visibilitychange', synchronize);
      unsubscribe();
      renderer.dispose();
      delete paper.dataset.renderer;
      delete paper.dataset.captures;
    };
  }, [progress, lateral, reducedMotion]);

  return (
    <div ref={paperRef} className="flight-paper">
      <div ref={sourceRef} className="flight-paper__source">
        {children}
      </div>
      {!reducedMotion && <canvas ref={canvasRef} className="flight-paper__canvas" aria-hidden="true" />}
    </div>
  );
}
