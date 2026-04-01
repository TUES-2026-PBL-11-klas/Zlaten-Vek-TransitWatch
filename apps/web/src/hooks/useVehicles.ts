import { useEffect, useRef, useState } from 'react';
import { transitApi } from '../lib/transit-api';
import type { VehiclePosition } from '../types/transit';

interface UseVehiclesResult {
  vehicles: VehiclePosition[];
  lastUpdate: number;
}

const POLL_INTERVAL_MS = 10_000;
const STALE_THRESHOLD_MS = 60_000;

export function useVehicles(): UseVehiclesResult {
  const [vehiclesMap, setVehiclesMap] = useState<Map<string, VehiclePosition>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const lastTimestampRef = useRef<number | undefined>(undefined);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mergeVehicles = (incoming: VehiclePosition[]) => {
    const now = Date.now();
    setVehiclesMap((prev) => {
      const next = new Map(prev);
      // Merge incoming
      for (const v of incoming) {
        next.set(v.vehicleId, v);
      }
      // Remove stale vehicles
      for (const [id, v] of next) {
        if (now - v.updatedAt * 1000 > STALE_THRESHOLD_MS) {
          next.delete(id);
        }
      }
      return next;
    });
    setLastUpdate(now);
  };

  useEffect(() => {
    // Initial full fetch
    transitApi.getVehicles().then((res) => {
      lastTimestampRef.current = res.timestamp;
      mergeVehicles(res.vehicles);
    });

    // Delta polling
    intervalRef.current = setInterval(async () => {
      const res = await transitApi.getVehicles(lastTimestampRef.current);
      lastTimestampRef.current = res.timestamp;
      mergeVehicles(res.vehicles);
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { vehicles: Array.from(vehiclesMap.values()), lastUpdate };
}
