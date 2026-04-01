import { useCallback, useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import type { VehiclePosition } from '../../types/transit';

interface SelectedStop {
  id: string;
  lat: number;
  lng: number;
}

interface MapControllerProps {
  selectedVehicle: VehiclePosition | null;
  selectedStop: SelectedStop | null;
  onFollowChange?: (following: boolean) => void;
}

export default function MapController({ selectedVehicle, selectedStop, onFollowChange }: MapControllerProps) {
  const map = useMap();
  const prevVehicleId = useRef<string | null>(null);
  const prevStopId = useRef<string | null>(null);
  const isFollowing = useRef(true);
  const isAutoMoving = useRef(false);

  const stopFollowing = useCallback(() => {
    if (isFollowing.current) {
      isFollowing.current = false;
      onFollowChange?.(false);
    }
  }, [onFollowChange]);

  // Detect user drag → stop following
  useMapEvents({
    dragstart: stopFollowing,
  });

  // Reset follow state when vehicle selection changes
  useEffect(() => {
    if (!selectedVehicle) {
      prevVehicleId.current = null;
      isFollowing.current = false;
      onFollowChange?.(false);
      return;
    }

    if (selectedVehicle.vehicleId !== prevVehicleId.current) {
      // New vehicle selected — fly to it and start following
      prevVehicleId.current = selectedVehicle.vehicleId;
      isFollowing.current = true;
      onFollowChange?.(true);

      const target: [number, number] = [selectedVehicle.lat, selectedVehicle.lng];
      const zoom = map.getZoom();
      isAutoMoving.current = true;
      if (zoom > 16) {
        map.flyTo(target, 15, { animate: true, duration: 0.6 });
      } else if (zoom < 13) {
        map.flyTo(target, 14, { animate: true, duration: 0.6 });
      } else {
        map.panTo(target, { animate: true, duration: 0.4 });
      }
      setTimeout(() => { isAutoMoving.current = false; }, 800);
    } else if (isFollowing.current) {
      // Same vehicle, position updated — smoothly follow
      const target: [number, number] = [selectedVehicle.lat, selectedVehicle.lng];
      isAutoMoving.current = true;
      map.panTo(target, { animate: true, duration: 0.8 });
      setTimeout(() => { isAutoMoving.current = false; }, 1000);
    }
  }, [selectedVehicle, map, onFollowChange]);

  // Handle stop selection
  useEffect(() => {
    if (!selectedStop) {
      prevStopId.current = null;
      return;
    }
    if (selectedStop.id === prevStopId.current) return;
    prevStopId.current = selectedStop.id;

    const target: [number, number] = [selectedStop.lat, selectedStop.lng];
    const zoom = map.getZoom();
    if (zoom > 16) {
      map.flyTo(target, 15, { animate: true, duration: 0.6 });
    } else {
      map.panTo(target, { animate: true, duration: 0.4 });
    }
  }, [selectedStop, map]);

  return null;
}
