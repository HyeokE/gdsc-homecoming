import { useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore } from 'react';
import type { DepartureResult } from '../types/departure';
import { PREPARE_DURATION, PRINT_DURATION, departureFlowReducer } from '../utils/departureFlow';
import { createRollingPlan, rollingStateAt, ROLLING_TIMING } from '../utils/orderedWheel';

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (notify: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useDepartureReveal(result: DepartureResult, fixedRowSeed?: number) {
  const [rowSeed] = useState(() => fixedRowSeed ?? Math.random());
  const [rowSelection, setRowSelection] = useState<{
    runId: number;
    index: number;
  } | null>(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const plan = useMemo(() => createRollingPlan(result), [result]);
  const [clock, setClock] = useState(0);
  const [flow, dispatch] = useReducer(departureFlowReducer, null, () =>
    departureFlowReducer(
      { screen: 'idle' },
      {
        type: 'start',
        now: performance.now(),
        reducedMotion,
        landscape: isLandscape,
      },
    ),
  );
  const runId = flow.screen === 'idle' ? 0 : flow.runId;
  const [capturedTime, captureTime] = useReducer(
    (previous: { runId: number; time: string } | null, next: { runId: number; time: string }) =>
      previous?.runId === next.runId ? previous : next,
    null,
  );
  const setRowCapacity = useCallback(
    (count: number) => {
      setRowSelection((previous) =>
        previous?.runId === runId
          ? previous
          : {
              runId,
              index: Math.floor(((rowSeed + runId * 0.61803398875) % 1) * Math.max(1, count)),
            },
      );
    },
    [runId, rowSeed],
  );
  const revealStart = flow.screen === 'reveal' && flow.pausedAt === null ? flow.startedAt : null;
  const needsOrientation = flow.screen === 'reveal' && (!isLandscape || flow.pausedAt !== null);
  useEffect(() => {
    if (revealStart === null || !isLandscape) {
      return;
    }
    const now = new Date();
    captureTime({
      runId,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    });
  }, [revealStart, isLandscape, runId]);

  useEffect(() => {
    dispatch({
      type: 'orientation',
      now: performance.now(),
      landscape: isLandscape,
    });
  }, [isLandscape]);

  useEffect(() => {
    if (revealStart === null || reducedMotion) {
      return;
    }
    let frame = 0;
    let active = true;
    let lastUpdate = 0;
    const tick = (now: number) => {
      if (!active) {
        return;
      }
      const layoutStart = revealStart + plan.countryEnd + ROLLING_TIMING.labelHoldMs;
      const shrinking =
        now >= layoutStart + ROLLING_TIMING.layoutMs * 0.32 && now <= layoutStart + ROLLING_TIMING.layoutMs;
      if (shrinking || now - lastUpdate >= 30 || now >= revealStart + plan.readyAt) {
        setClock(now);
        lastUpdate = now;
      }
      if (now < revealStart + plan.readyAt) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [revealStart, plan, reducedMotion]);

  useEffect(() => {
    if (flow.screen !== 'reveal' || flow.pausedAt !== null || flow.phase === 'ready') {
      return;
    }
    const stages = reducedMotion
      ? [{ phase: 'ready' as const, at: 0 }]
      : plan.timeline.slice(plan.timeline.findIndex((stage) => stage.phase === flow.phase) + 1);
    const timers = stages.map((stage) =>
      window.setTimeout(
        () =>
          dispatch({
            type: 'reveal',
            runId: flow.runId,
            startedAt: flow.startedAt,
            phase: stage.phase,
          }),
        Math.max(0, flow.startedAt + stage.at - performance.now()),
      ),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [flow, plan, reducedMotion]);

  useEffect(() => {
    if (flow.screen !== 'issuer' || flow.phase === 'complete') {
      return;
    }
    const preparing = flow.phase === 'preparing';
    const deadline = flow.printingStartedAt + PREPARE_DURATION + (preparing || reducedMotion ? 0 : PRINT_DURATION);
    const timer = window.setTimeout(
      () => dispatch({ type: preparing ? 'print' : 'printed', runId: flow.runId }),
      Math.max(0, deadline - performance.now()),
    );
    return () => window.clearTimeout(timer);
  }, [flow, reducedMotion]);

  const displayResult = useMemo(
    () => ({
      ...result,
      airlineLabel: 'GDG',
      airlineCode: result.airlineCode ?? 'KE',
      flightNumber: result.flightNumber ?? '121',
      arrivalAirportCode: result.arrivalAirportCode ?? 'ICN',
      boardingTime: capturedTime?.runId === runId ? capturedTime.time : result.boardingTime,
    }),
    [result, capturedTime, runId],
  );

  return {
    displayResult,
    flow,
    userRowIndex: rowSelection?.runId === runId ? rowSelection.index : 0,
    setRowCapacity,
    reducedMotion,
    needsOrientation,
    isLandscape,
    rolling: rollingStateAt(
      plan,
      flow.screen === 'reveal' ? Math.max(0, (flow.pausedAt ?? Math.max(clock, flow.resumedAt)) - flow.startedAt) : 0,
      flow.screen === 'idle' ? 0 : flow.runId,
      reducedMotion || (flow.screen === 'reveal' && flow.phase === 'ready'),
    ),
    start: () =>
      dispatch({
        type: 'start',
        now: performance.now(),
        reducedMotion,
        landscape: isLandscape,
      }),
    confirm: () => {
      if (needsOrientation) {
        return;
      }
      dispatch({
        type: 'confirm',
        now: performance.now(),
        reducedMotion,
      });
    },
  };
}
