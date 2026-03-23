import { useCallback, useState } from 'react';
import { CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useStops } from '../../hooks/useStops';
import type { TransitStop } from '../../types/transit';

interface StopMarkersProps {
  onStopSelect: (stopId: string) => void;
}

function StopCircle({
  stop,
  zoom,
  onStopSelect,
}: {
  stop: TransitStop;
  zoom: number;
  onStopSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const baseRadius = zoom >= 16 ? 6 : 4;
  const radius = hovered ? baseRadius + 1.5 : baseRadius;

  return (
    <CircleMarker
      center={[stop.lat, stop.lng]}
      radius={radius}
      pathOptions={{
        fillColor: hovered ? '#DCFCE7' : '#F0FDF4',
        fillOpacity: hovered ? 0.98 : 0.86,
        color: hovered ? '#16A34A' : '#0F766E',
        weight: hovered ? 2 : 1.5,
      }}
      eventHandlers={{
        mouseover: () => setHovered(true),
        mouseout: () => setHovered(false),
        click: () => onStopSelect(stop.id),
      }}
    >
      <Tooltip direction="top" className="stop-tooltip">
        {stop.name}
      </Tooltip>
    </CircleMarker>
  );
}

export default function StopMarkers({ onStopSelect }: StopMarkersProps) {
  const map = useMap();
  const zoom = map.getZoom();
  const { stops } = useStops();

  const handleSelect = useCallback(
    (id: string) => onStopSelect(id),
    [onStopSelect],
  );

  if (zoom < 15) return null;

  return (
    <>
      {stops.map((stop) => (
        <StopCircle
          key={stop.id}
          stop={stop}
          zoom={zoom}
          onStopSelect={handleSelect}
        />
      ))}
    </>
  );
}
