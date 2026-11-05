import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { Link } from 'react-router-dom';
import { AirlineBrand, PaperTicket } from '@/components/brand';
import { HomeProgram } from './HomeProgram';
import { FlightPaper } from './FlightPaper';
import { FlightRoute } from './FlightRoute';
import { createFlightPath } from './flightPath';
import './styles/journey.css';

const FLIGHT_STAGES = [0, 0.16, 0.32, 0.48, 0.62, 0.73, 0.8, 1];

const lateralPath = createFlightPath(FLIGHT_STAGES, [0, -12, 9, -9, 7, -5, 4, -3]);
const verticalPath = createFlightPath(FLIGHT_STAGES, [17, -22, -24, -24, -20, 0, 0, 0]);
const scalePath = createFlightPath(FLIGHT_STAGES, [1, 0.6, 0.6, 0.6, 0.7, 1, 1, 1]);
const yawPath = createFlightPath(FLIGHT_STAGES, [-12, 12, -9, 9, -7, 5, -4, 3]);
const pitchPath = createFlightPath(FLIGHT_STAGES, [10, -8, 6, -6, 5, -4, 4, -3]);

export function JourneyPage({ ticket }: { ticket: ReactNode }) {
  const containerRef = useRef<HTMLElement>(null);
  const landingRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLElement>(null);
  const sceneHeight = useMotionValue(844);
  const storyRef = useRef<HTMLDivElement>(null);
  const invitationRef = useRef<HTMLElement>(null);
  const programRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const { scrollYProgress, scrollY } = useScroll({ target: storyRef, offset: ['start start', 'end end'] });

  const { scrollYProgress: programProgress } = useScroll({
    target: programRef,
    offset: ['start 25%', 'end 15%'],
  });
  const ticketOpacity = useTransform(programProgress, [0, 0.06, 0.94, 1], [1, 0.28, 0.28, 1]);
  const ticketBlur = useTransform(
    programProgress,
    [0, 0.06, 0.94, 1],
    ['blur(0px)', 'blur(2px)', 'blur(2px)', 'blur(0px)'],
  );

  const { scrollYProgress: invitationProgress } = useScroll({
    target: invitationRef,
    offset: ['start end', 'end start'],
  });
  const sceneOpacity = useTransform(invitationProgress, [0.6, 0.85], [1, 0]);

  const paperProgress = useTransform(invitationProgress, [0, 0.75, 1], [0, 0.6, 1]);

  const flightProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.0001 });

  // Keep one modest-sized ticket layer; avoid scaling a full-screen SVG in Safari.
  const ticketLateral = useTransform(flightProgress, lateralPath);
  const ticketX = useTransform(ticketLateral, (value) => `${value}%`);
  const ticketY = useTransform(flightProgress, (value) => `${verticalPath(value)}svh`);
  const ticketScale = useTransform(flightProgress, scalePath);
  const lateralVelocity = useVelocity(ticketLateral);
  const bank = useSpring(lateralVelocity, { stiffness: 65, damping: 16 });
  const ticketRotate = useTransform(
    () => -8 + ticketLateral.get() * 0.45 - Math.max(-18, Math.min(18, bank.get() * 0.22)),
  );
  const ticketRotateY = useTransform(flightProgress, yawPath);
  const ticketRotateX = useTransform(flightProgress, pitchPath);
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }
    const measure = () => sceneHeight.set(scene.clientHeight);
    const observer = new ResizeObserver(measure);
    observer.observe(scene);
    measure();
    return () => observer.disconnect();
  }, [sceneHeight]);
  const openingOpacity = useTransform(() =>
    Math.max(0, Math.min(1, 1 - (scrollY.get() / sceneHeight.get() - 0.38) / 0.39)),
  );

  return (
    <main ref={containerRef} className="journey">
      <motion.header className="journey__header" style={{ opacity: reducedMotion ? 1 : sceneOpacity }}>
        <AirlineBrand className="journey__brand" />
      </motion.header>
      <FlightRoute containerRef={containerRef} landingRef={landingRef} />
      <div ref={storyRef} className="journey__story">
        <section
          ref={sceneRef}
          className="journey__scene"
          aria-label="각자의 여행을 마친 졸업생에게 도착하는 홈커밍 초대장"
        >
          <motion.div
            className="journey__backdrop"
            aria-hidden="true"
            style={{ opacity: reducedMotion ? 1 : sceneOpacity }}
          />
          <motion.div className="journey__canvas" style={{ opacity: reducedMotion ? 1 : sceneOpacity }}>
            <motion.div className="journey__opening" style={{ opacity: reducedMotion ? 1 : openingOpacity }}>
              <h1 className="journey__display">
                <span className="journey__home-word">
                  <svg
                    className="journey__departure-runway"
                    viewBox="0 0 200 18"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    fill="none"
                  >
                    <path d="M0 1H200M0 17H200" stroke="currentColor" strokeWidth="1" />
                    <path
                      d="M8 4V14M12 4V14M16 4V14M184 4V14M188 4V14M192 4V14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path d="M28 9H172" stroke="currentColor" strokeWidth="1" strokeDasharray="9 8" />
                  </svg>
                  HOME
                </span>
                <br />
                COMING
              </h1>
              <p className="journey__organizer">
                Google Developer Groups on Campus
                <br />
                Daejin University
              </p>
            </motion.div>
            <div className="journey__ticket-stage">
              <motion.div
                className="journey__flying-ticket"
                style={
                  reducedMotion
                    ? undefined
                    : {
                        opacity: ticketOpacity,
                        filter: ticketBlur,
                        x: ticketX,
                        y: ticketY,
                        scale: ticketScale,
                        rotate: ticketRotate,
                        rotateY: ticketRotateY,
                        rotateX: ticketRotateX,
                      }
                }
              >
                <FlightPaper progress={paperProgress} lateral={ticketLateral} reducedMotion={reducedMotion}>
                  {ticket}
                </FlightPaper>
              </motion.div>
            </div>
            <div className="journey__scroll" aria-hidden="true">
              <svg viewBox="0 0 24 32" fill="none">
                <path d="M12 3v24M4 19l8 8 8-8" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          </motion.div>
        </section>
        <div className="journey__story-content">
          <div ref={programRef} className="journey__program">
            <HomeProgram />
          </div>
          <section ref={invitationRef} className="journey__invitation" aria-label="홈커밍 초대">
            <p>당신을 초대합니다.</p>
          </section>
        </div>
      </div>
      <div id="arrival" className="journey__arrival">
        <PaperTicket titleId="journey-title">
          <h2 id="journey-title" className="sr-only">
            일정 및 장소
          </h2>
          <dl className="journey__details">
            <div>
              <dt>일정</dt>
              <dd>
                <time dateTime="2026-11-21">2026년 11월 21일</time>
                <span>15:00–23:00</span>
              </dd>
            </div>
            <div>
              <dt>장소</dt>
              <dd>
                <a
                  className="journey__venue"
                  href="https://naver.me/GMmLF6Ap"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  성수 그린힐드 ↗
                </a>
              </dd>
            </div>
          </dl>
          <div ref={landingRef} className="journey__landing">
            <Link className="journey__ticket" to="/email">
              <svg
                className="journey__button-runway"
                viewBox="0 0 300 14"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M12 3V11M17 3V11M22 3V11M278 3V11M283 3V11M288 3V11" stroke="currentColor" strokeWidth="2" />
                <path d="M38 7H262" stroke="currentColor" strokeWidth="1" strokeDasharray="12 12" />
              </svg>
              탑승권 발급하러 가기 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </PaperTicket>
      </div>
    </main>
  );
}
