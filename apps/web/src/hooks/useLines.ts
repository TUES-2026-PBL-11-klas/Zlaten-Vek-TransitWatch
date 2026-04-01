import { useEffect, useState } from 'react';
import { transitApi } from '../lib/transit-api';
import type { TransitLine } from '../types/transit';

interface UseLinesResult {
  lines: TransitLine[];
  linesByGtfsId: Map<string, TransitLine>;
  loading: boolean;
}

export function useLines(): UseLinesResult {
  const [lines, setLines] = useState<TransitLine[]>([]);
  const [linesByGtfsId, setLinesByGtfsId] = useState<Map<string, TransitLine>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transitApi
      .getAllLines()
      .then((data) => {
        setLines(data);
        const map = new Map<string, TransitLine>();
        for (const line of data) {
          if (line.gtfsId) map.set(line.gtfsId, line);
        }
        setLinesByGtfsId(map);
      })
      .catch((err) => {
        console.error('Failed to load transit lines:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return { lines, linesByGtfsId, loading };
}
