import { useCallback, useEffect, useRef, useState } from 'react';
import { transitApi } from '../lib/transit-api';
import type { ActiveReport } from '../types/transit';

const POLL_INTERVAL_MS = 30_000;
const REFETCH_EVENT = 'transitwatch:refetch-reports';

/** Call this from anywhere to trigger an immediate refetch of active reports in all hooks. */
export function triggerReportsRefetch() {
  window.dispatchEvent(new Event(REFETCH_EVENT));
}

interface UseActiveReportsResult {
  reports: ActiveReport[];
  reportsByLineId: Map<string, ActiveReport[]>;
  reportsByVehicleId: Map<string, ActiveReport[]>;
  loading: boolean;
  refetch: () => void;
}

export function useActiveReports(): UseActiveReportsResult {
  const [reports, setReports] = useState<ActiveReport[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchReports = useCallback(async () => {
    try {
      const data = await transitApi.getActiveReports();
      if (mountedRef.current) {
        setReports(data);
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch active reports:', err);
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch — deferred to avoid sync setState in effect body
    const initialTimer = setTimeout(() => fetchReports(), 0);
    intervalRef.current = setInterval(fetchReports, POLL_INTERVAL_MS);

    // Listen for manual refetch triggers (e.g. after submitting a report)
    const handler = () => { fetchReports(); };
    window.addEventListener(REFETCH_EVENT, handler);

    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener(REFETCH_EVENT, handler);
    };
  }, [fetchReports]);

  const reportsByLineId = new Map<string, ActiveReport[]>();
  const reportsByVehicleId = new Map<string, ActiveReport[]>();
  for (const report of reports) {
    const existing = reportsByLineId.get(report.lineId) ?? [];
    existing.push(report);
    reportsByLineId.set(report.lineId, existing);

    if (report.vehicleId) {
      const byVehicle = reportsByVehicleId.get(report.vehicleId) ?? [];
      byVehicle.push(report);
      reportsByVehicleId.set(report.vehicleId, byVehicle);
    }
  }

  return { reports, reportsByLineId, reportsByVehicleId, loading, refetch: fetchReports };
}
