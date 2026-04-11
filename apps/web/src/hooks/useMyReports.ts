import { useCallback, useEffect, useState } from 'react';
import { transitApi } from '../lib/transit-api';
import type { ActiveReport } from '../types/transit';

interface UseMyReportsResult {
  reports: ActiveReport[];
  loading: boolean;
  refetch: () => void;
}

export function useMyReports(): UseMyReportsResult {
  const [reports, setReports] = useState<ActiveReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await transitApi.getMyReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch my reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, refetch: fetchReports };
}
