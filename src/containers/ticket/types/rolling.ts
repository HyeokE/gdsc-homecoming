export interface RollingCell {
  current: string;
  next: string;
  stepId: string;
  isFlipping: boolean;
  durationMs: number;
  /** Offset at first render of this step; use once when mounting its leaves. */
  elapsedMs: number;
}

export interface RollingState {
  country: RollingCell[];
  passenger: RollingCell[];
  airport: RollingCell[];
  gate: RollingCell[];
  countrySettled: boolean;
  airportSettled: boolean;
  boardTransitionProgress: number;
  layoutDurationMs: number;
}
