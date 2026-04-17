import { useMap } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import type { UserLocation } from '../../hooks/useUserLocation';

interface LocateMeButtonProps {
  location: UserLocation | null;
  requestLocation: () => void;
}

export default function LocateMeButton({ location, requestLocation }: LocateMeButtonProps) {
  const map = useMap();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (location) {
      map.flyTo([location.lat, location.lng], 16, { duration: 0.6 });
      return;
    }

    // No location yet — re-request (triggers browser permission prompt if needed)
    requestLocation();
  };

  return (
    <button
      className="locate-me-btn"
      onClick={handleClick}
      title="Моето местоположение"
    >
      <LocateFixed size={20} strokeWidth={2.2} />
    </button>
  );
}
