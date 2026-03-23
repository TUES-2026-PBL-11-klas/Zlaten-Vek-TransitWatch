import { useEffect, useRef, useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import { transitApi } from '../lib/transit-api';
import type { TransitStop } from '../types/transit';

interface UseStopsResult {
  stops: TransitStop[];
  loading: boolean;
}

const STOP_ZOOM_THRESHOLD = 14;
const DEBOUNCE_MS = 500;

function getBbox(map: L.Map) {
  const bounds = map.getBounds();
  return {
    minLat: bounds.getSouth(),
    minLng: bounds.getWest(),
    maxLat: bounds.getNorth(),
    maxLng: bounds.getEast(),
  };
}

export function useStops(): UseStopsResult {
  const [stopsMap, setStopsMap] = useState<Map<string, TransitStop>>(new Map());
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStops = (map: L.Map) => {
    const zoom = map.getZoom();
    if (zoom < STOP_ZOOM_THRESHOLD) {
      setStopsMap(new Map());
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await transitApi.getStopsByBbox(getBbox(map));
        setStopsMap((prev) => {
          const next = new Map(prev);
          for (const stop of data) next.set(stop.id, stop);
          return next;
        });
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  };

  useMapEvents({
    moveend(e) {
      fetchStops(e.target as L.Map);
    },
    zoomend(e) {
      fetchStops(e.target as L.Map);
    },
    load(e) {
      fetchStops(e.target as L.Map);
    },
  });

  return { stops: Array.from(stopsMap.values()), loading };
}

// Also export a version that takes the map instance directly (for initial load)
export function useStopsInit(map: L.Map | null): UseStopsResult {
  const [stopsMap, setStopsMap] = useState<Map<string, TransitStop>>(new Map());
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevZoomRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map) return;

    const fetch = () => {
      const zoom = map.getZoom();
      if (zoom < STOP_ZOOM_THRESHOLD) {
        setStopsMap(new Map());
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const data = await transitApi.getStopsByBbox(getBbox(map));
          setStopsMap((prev) => {
            const next = new Map(prev);
            for (const stop of data) next.set(stop.id, stop);
            return next;
          });
        } finally {
          setLoading(false);
        }
      }, DEBOUNCE_MS);
    };

    map.on('moveend', fetch);
    map.on('zoomend', fetch);

    // Initial fetch
    fetch();

    return () => {
      map.off('moveend', fetch);
      map.off('zoomend', fetch);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [map]);

  // Clean up stops when zoomed out
  useEffect(() => {
    if (!map) return;
    const onZoom = () => {
      const zoom = map.getZoom();
      if (zoom < STOP_ZOOM_THRESHOLD && prevZoomRef.current !== null && prevZoomRef.current >= STOP_ZOOM_THRESHOLD) {
        setStopsMap(new Map());
      }
      prevZoomRef.current = zoom;
    };
    map.on('zoom', onZoom);
    return () => { map.off('zoom', onZoom); };
  }, [map]);

  return { stops: Array.from(stopsMap.values()), loading };
}
