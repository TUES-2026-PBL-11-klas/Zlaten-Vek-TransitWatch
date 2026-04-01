import { useEffect, useReducer, useRef } from 'react';
import { transitApi } from '../lib/transit-api';
import type { TripTimeline, ShapeData } from '../types/transit';

interface UseTripTimelineResult {
  timeline: TripTimeline | null;
  shape: ShapeData | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'reset' }
  | { type: 'fetch-start' }
  | { type: 'fetch-done'; timeline: TripTimeline }
  | { type: 'fetch-error'; error: string }
  | { type: 'shape'; shape: ShapeData | null }
  | { type: 'loading-done' };

const INITIAL_STATE: UseTripTimelineResult = {
  timeline: null,
  shape: null,
  loading: false,
  error: null,
};

function reducer(state: UseTripTimelineResult, action: Action): UseTripTimelineResult {
  switch (action.type) {
    case 'reset':
      return INITIAL_STATE;
    case 'fetch-start':
      return { ...state, loading: true };
    case 'fetch-done':
      return { ...state, timeline: action.timeline, error: null };
    case 'fetch-error':
      return { ...state, error: action.error };
    case 'shape':
      return { ...state, shape: action.shape };
    case 'loading-done':
      return { ...state, loading: false };
    default:
      return state;
  }
}

const POLL_INTERVAL_MS = 15_000;

export function useTripTimeline(vehicleId: string | null): UseTripTimelineResult {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLineIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      dispatch({ type: 'reset' });
      return;
    }

    let cancelled = false;

    const doFetch = async () => {
      try {
        const tl = await transitApi.getVehicleTripTimeline(vehicleId);
        if (cancelled) return;
        dispatch({ type: 'fetch-done', timeline: tl });

        // Only fetch shape if lineId changed
        if (tl.lineId !== lastLineIdRef.current) {
          lastLineIdRef.current = tl.lineId;
          try {
            const s = await transitApi.getLineShape(tl.lineId);
            if (!cancelled) dispatch({ type: 'shape', shape: s });
          } catch {
            if (!cancelled) dispatch({ type: 'shape', shape: null });
          }
        }
      } catch {
        if (!cancelled) dispatch({ type: 'fetch-error', error: 'Грешка при зареждане на маршрута' });
      }
    };

    // Initial fetch
    dispatch({ type: 'fetch-start' });
    doFetch().finally(() => {
      if (!cancelled) dispatch({ type: 'loading-done' });
    });

    // Poll every 15 seconds
    intervalRef.current = setInterval(doFetch, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      lastLineIdRef.current = null;
    };
  }, [vehicleId]);

  return state;
}
