import { CircleMarker } from 'react-leaflet';
import type { UserLocation } from '../../hooks/useUserLocation';

interface UserLocationMarkerProps {
  location: UserLocation;
}

export default function UserLocationMarker({ location }: UserLocationMarkerProps) {
  return (
    <>
      {/* Accuracy ring */}
      <CircleMarker
        center={[location.lat, location.lng]}
        radius={Math.min(location.accuracy, 40)}
        pathOptions={{
          color: 'transparent',
          fillColor: '#3B82F6',
          fillOpacity: 0.1,
        }}
      />
      {/* Outer pulse ring */}
      <CircleMarker
        center={[location.lat, location.lng]}
        radius={10}
        className="user-location-pulse"
        pathOptions={{
          color: '#3B82F6',
          weight: 2,
          fillColor: '#3B82F6',
          fillOpacity: 0.15,
        }}
      />
      {/* Inner dot */}
      <CircleMarker
        center={[location.lat, location.lng]}
        radius={6}
        pathOptions={{
          color: '#FFFFFF',
          weight: 2.5,
          fillColor: '#3B82F6',
          fillOpacity: 1,
        }}
      />
    </>
  );
}
