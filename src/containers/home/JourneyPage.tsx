import { useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from 'motion/react';
import { Link } from 'react-router-dom';
import { AirlineBrand, PaperTicket } from '@/components/brand';
import { HomeProgram } from './HomeProgram';
import { FlightPaper } from './FlightPaper';
import { createFlightPath } from './flightPath';
import './styles/journey.css';

const FLIGHT_STAGES = [0, 0.16, 0.32, 0.48, 0.62, 0.73, 0.8, 1];

const lateralPath = createFlightPath(FLIGHT_STAGES, [8, -14, -11, -6, -2, 0, 0, 0]);
const verticalPath = createFlightPath(FLIGHT_STAGES, [17, 8, -3, -5, -2, 0, 0, 0]);
const scalePath = createFlightPath(FLIGHT_STAGES, [0.82, 0.72, 0.78, 0.82, 0.9, 1, 1, 1]);
const yawPath = createFlightPath(FLIGHT_STAGES, [-12, 12, 9, 5, 2, 0, 0, 0]);
const pitchPath = createFlightPath(FLIGHT_STAGES, [10, -8, -6, -3, -1, 0, 0, 0]);

export function JourneyPage({ ticket }: { ticket: ReactNode }) {
  const storyRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: storyRef, offset: ['start start', 'end end'] });

  const flightProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.0001 });

  // Keep one modest-sized ticket layer; avoid scaling a full-screen SVG in Safari.
  const ticketLateral = useTransform(flightProgress, lateralPath);
  const ticketX = useTransform(ticketLateral, (value) => `${value}%`);
  const ticketY = useTransform(flightProgress, (value) => `${verticalPath(value)}svh`);
  const ticketScale = useTransform(flightProgress, scalePath);
  const lateralVelocity = useVelocity(ticketLateral);
  const bank = useSpring(lateralVelocity, { stiffness: 65, damping: 16 });
  const ticketRotate = useTransform(() => {
    const progress = flightProgress.get();
    const settling = Math.max(0, 1 - Math.max(0, progress - 0.62) / 0.18);
    return (-12 * (1 - Math.min(1, progress / 0.73)) - Math.max(-22, Math.min(22, bank.get() * 0.22))) * settling;
  });
  const ticketRotateY = useTransform(flightProgress, yawPath);
  const ticketRotateX = useTransform(flightProgress, pitchPath);
  const openingOpacity = useTransform(scrollYProgress, [0, 0.1, 0.22], [1, 1, 0]);
  const inviteOpacity = useTransform(scrollYProgress, [0.56, 0.66], [0, 1]);
  const sceneOpacity = useTransform(scrollYProgress, [0.94, 1], [1, 0]);

  return (
    <main className="journey">
      <div ref={storyRef} className="journey__story">
        <section className="journey__scene" aria-label="각자의 여행을 마친 졸업생에게 도착하는 홈커밍 초대장">
          <motion.div
            className="journey__backdrop"
            aria-hidden="true"
            style={{ opacity: reducedMotion ? 1 : sceneOpacity }}
          />
          <motion.div className="journey__canvas" style={{ opacity: reducedMotion ? 1 : sceneOpacity }}>
            <header className="journey__header">
              <AirlineBrand className="journey__brand" />
            </header>
            <motion.div className="journey__opening" style={{ opacity: reducedMotion ? 0 : openingOpacity }}>
              <p className="journey__display">
                HOME
                <br />
                COMING
              </p>
              <p className="journey__opening-caption">다시 만날 시간.</p>
            </motion.div>
            <motion.p className="journey__message" style={{ opacity: reducedMotion ? 1 : inviteOpacity }}>
              당신을 초대합니다.
            </motion.p>
            <div className="journey__ticket-stage">
              <motion.div
                className="journey__flying-ticket"
                style={
                  reducedMotion
                    ? undefined
                    : {
                        x: ticketX,
                        y: ticketY,
                        scale: ticketScale,
                        rotate: ticketRotate,
                        rotateY: ticketRotateY,
                        rotateX: ticketRotateX,
                      }
                }
              >
                <FlightPaper progress={flightProgress} lateral={ticketLateral} reducedMotion={reducedMotion}>
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
      </div>
      <div id="arrival" className="journey__arrival">
        <PaperTicket titleId="journey-title">
          <h1 id="journey-title" className="journey__title">
            HOME
            <br />
            COMING
          </h1>
          <p className="journey__date">2026.11.21 · 15:00–23:00</p>
          <a className="journey__venue" href="https://naver.me/GMmLF6Ap" target="_blank" rel="noopener noreferrer">
            성수 그린힐드 ↗
          </a>
          <Link className="journey__ticket" to="/email">
            탑승권 발급하러 가기 <span aria-hidden="true">→</span>
          </Link>
          <HomeProgram />
        </PaperTicket>
      </div>
    </main>
  );
}
