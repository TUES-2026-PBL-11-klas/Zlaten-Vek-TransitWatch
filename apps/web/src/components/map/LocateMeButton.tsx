import { useMap } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import type { UserLocation } from '../../hooks/useUserLocation';

interface LocateMeButtonProps {
  location: UserLocation | null;
}

export default function LocateMeButton({ location }: LocateMeButtonProps) {
  const map = useMap();

  if (!location) return null;

  return (
    <button
      className="locate-me-btn"
      onClick={(e) => {
        e.stopPropagation();
        map.flyTo([location.lat, location.lng], 16, { duration: 0.6 });
      }}
      title="Моето местоположение"
    >
      <LocateFixed size={20} strokeWidth={2.2} />
    </button>
  );
}
