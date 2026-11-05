import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useReducedMotion } from 'motion/react';

const AIRCRAFT_NOSE_LENGTH = 27;

const AIRCRAFT_COLORS = ['#4285f4', '#ea4335', '#fbbc05', '#34a853'];

interface FlightRouteProps {
  containerRef: RefObject<HTMLElement | null>;
  landingRef: RefObject<HTMLDivElement | null>;
}

/** A single unscaled SVG route; only the aircraft transform changes while scrolling. */
export function FlightRoute({ containerRef, landingRef }: FlightRouteProps) {
  const [aircraftColor] = useState(() => AIRCRAFT_COLORS[Math.floor(Math.random() * AIRCRAFT_COLORS.length)]);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const planeRef = useRef<SVGGElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    const landing = landingRef.current;
    const svg = svgRef.current;
    const path = pathRef.current;
    const plane = planeRef.current;
    if (!container || !landing || !svg || !path || !plane) {
      return;
    }

    let length = 0;
    let startY = 0;
    let endY = 0;
    let frame = 0;
    let startX = 0;
    let endX = 0;
    let containerTop = 0;
    let takeoffScroll = 1;
    let landingScroll = 1;
    let viewportHeight = 1;
    let routeEdge = 20;
    let landingRadius = 32;
    let runwayExit = 56;
    let aircraftScale = 1;
    const paint = () => {
      frame = 0;
      const scroll = reducedMotion ? 0 : Math.max(0, window.scrollY - containerTop);
      const runwayLength = Math.max(0, startX - runwayExit);
      const travel = Math.max(1, landingScroll - takeoffScroll);
      const progress = Math.min(1, Math.max(0, scroll - takeoffScroll) / travel);
      const distance =
        scroll < takeoffScroll
          ? runwayLength * (scroll / takeoffScroll) ** 2
          : runwayLength + progress * (length - runwayLength);
      const point = path.getPointAtLength(distance);
      const before = path.getPointAtLength(Math.max(0, distance - 1));
      const after = path.getPointAtLength(Math.min(length, distance + 1));
      const angle = (Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI;
      plane.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle}) scale(${aircraftScale})`);
    };
    const measure = () => {
      const bounds = container.getBoundingClientRect();
      const destination = landing.getBoundingClientRect();
      const scene = container.querySelector<HTMLElement>('.journey__scene');
      const opening = container.querySelector<HTMLElement>('.journey__opening');
      const homeWord = container.querySelector<HTMLElement>('.journey__home-word');
      viewportHeight = scene?.clientHeight || window.innerHeight;
      takeoffScroll = viewportHeight * 0.38;
      aircraftScale = Math.max(0.8, Math.min(1.1, bounds.width / 390));
      routeEdge = Math.max(20, 22 * aircraftScale);
      const runwayLeft = opening?.offsetLeft ?? 52;
      const runwayWidth = homeWord?.getBoundingClientRect().width || bounds.width * 0.5;
      runwayExit = runwayLeft + 4;
      landingRadius = Math.max(16, destination.left - bounds.left - routeEdge);
      startY = (opening?.offsetTop ?? viewportHeight * 0.23) - 9;
      endY = destination.top - bounds.top - takeoffScroll - 14 * aircraftScale;
      landingScroll = Math.min(bounds.height - viewportHeight, endY + takeoffScroll - viewportHeight * 0.72);
      endX = destination.right - bounds.left - AIRCRAFT_NOSE_LENGTH * aircraftScale;
      containerTop = bounds.top + window.scrollY;
      const routeHeight = bounds.height - takeoffScroll;
      svg.style.height = `${routeHeight}px`;
      svg.setAttribute('viewBox', `0 0 ${bounds.width} ${routeHeight}`);
      startX = runwayLeft + runwayWidth - 30 * aircraftScale;
      path.setAttribute(
        'd',
        `M ${startX} ${startY} H ${runwayExit} Q ${routeEdge} ${startY}, ${routeEdge} ${startY + 70} V ${endY - landingRadius} A ${landingRadius} ${landingRadius} 0 0 0 ${routeEdge + landingRadius} ${endY} H ${endX}`,
      );
      length = path.getTotalLength();
      paint();
    };
    const handleScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(paint);
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(landing);
    const homeWord = container.querySelector('.journey__home-word');
    const scene = container.querySelector('.journey__scene');
    if (homeWord) {
      observer.observe(homeWord);
    }
    if (scene) {
      observer.observe(scene);
    }
    measure();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', measure);
    };
  }, [containerRef, landingRef, reducedMotion]);

  return (
    <div className="journey__flight-route" aria-hidden="true">
      <svg ref={svgRef} className="journey__route-canvas" fill="none">
        <path ref={pathRef} stroke="#b9bcb8" strokeWidth="1" />
        <g ref={planeRef}>
          <path
            d="M26 0C26-2 20-3.5 16-3.5H5L-9-19Q-10-20-12-20H-16L-8-3.5H-19L-25-10H-29L-25-1.5V1.5L-29 10H-25L-19 3.5H-8L-16 20H-12Q-10 20-9 19L5 3.5H16C20 3.5 26 2 26 0Z"
            fill={aircraftColor}
            stroke="#faf9f6"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M17-2Q21-1.5 21 0Q21 1.5 17 2L18 0Z" fill="#20252a" opacity="0.7" />
          <path
            d="M-20 0H12M-7-4-12-15M-7 4-12 15"
            stroke="#fff"
            strokeWidth="0.8"
            opacity="0.65"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
