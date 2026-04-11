import { useEffect, useRef, useState } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

interface UseUserLocationResult {
  location: UserLocation | null;
  error: string | null;
}

const GEO_UNSUPPORTED = !navigator.geolocation;

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(
    GEO_UNSUPPORTED ? 'Геолокацията не се поддържа от браузъра.' : null,
  );
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (GEO_UNSUPPORTED) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Достъпът до местоположението е отказан.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Местоположението не е налично.');
        } else {
          setError('Изтече времето за определяне на местоположението.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { location, error };
}
