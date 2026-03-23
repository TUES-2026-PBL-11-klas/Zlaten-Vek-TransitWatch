import { useEffect, useState } from 'react';
import { transitApi } from '../lib/transit-api';
import type { TripTimeline, ShapeData } from '../types/transit';

interface UseTripTimelineResult {
  timeline: TripTimeline | null;
  shape: ShapeData | null;
  loading: boolean;
  error: string | null;
}

export function useTripTimeline(tripId: string | null): UseTripTimelineResult {
  const [timeline, setTimeline] = useState<TripTimeline | null>(null);
  const [shape, setShape] = useState<ShapeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    let cancelled = false;

    const doFetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const tl = await transitApi.getTripTimeline(tripId);
        if (cancelled) return;
        setTimeline(tl);
        try {
          const s = await transitApi.getLineShape(tl.lineId);
          if (!cancelled) setShape(s);
        } catch {
          if (!cancelled) setShape(null);
        }
      } catch {
        if (!cancelled) setError('Грешка при зареждане на маршрута');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doFetch();

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  return { timeline, shape, loading, error };
}
