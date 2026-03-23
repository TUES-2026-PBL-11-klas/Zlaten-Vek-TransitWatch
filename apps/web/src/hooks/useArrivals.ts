import { useEffect, useRef, useState } from 'react';
import { transitApi } from '../lib/transit-api';
import type { ArrivalInfo } from '../types/transit';

interface UseArrivalsResult {
  arrivals: ArrivalInfo[];
  stopName: string;
  loading: boolean;
  error: string | null;
}

const REFRESH_INTERVAL_MS = 30_000;

export function useArrivals(stopId: string | null): UseArrivalsResult {
  const [arrivals, setArrivals] = useState<ArrivalInfo[]>([]);
  const [stopName, setStopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!stopId) {
      setArrivals([]);
      setStopName('');
      setError(null);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await transitApi.getStopArrivals(stopId);
        setArrivals(data.arrivals);
        setStopName(data.stopName);
      } catch {
        setError('Грешка при зареждане на пристиганията');
      } finally {
        setLoading(false);
      }
    };

    fetch();
    intervalRef.current = setInterval(fetch, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stopId]);

  return { arrivals, stopName, loading, error };
}
