import { useCallback, useState, memo } from 'react';
import L from 'leaflet';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import { useStops, STOP_ZOOM_THRESHOLD } from '../../hooks/useStops';
import { TRANSIT_COLORS } from '../../types/transit';
import type { TransitStop, TransitType } from '../../types/transit';

interface StopMarkersProps {
  onStopSelect: (stop: TransitStop) => void;
  selectedStopId: string | null;
}

/* Priority order for picking dominant type */
const TYPE_PRIORITY: TransitType[] = ['metro', 'tram', 'trolley', 'bus'];

function getDominantType(types: TransitType[]): TransitType {
  if (!types.length) return 'bus';
  for (const t of TYPE_PRIORITY) {
    if (types.includes(t)) return t;
  }
  return 'bus';
}

/* ── Stop icon — simple colored dot ───────────────────────────────────── */

function buildStopIcon(
  type: TransitType,
  isSelected: boolean,
  isHovered: boolean,
): L.DivIcon {
  const baseColor = TRANSIT_COLORS[type] ?? '#6B7280';
  const size = isSelected ? 14 : isHovered ? 12 : 10;
  const bg = isSelected ? '#16A34A' : baseColor;
  const border = isSelected ? '2.5px solid #fff' : isHovered ? '2px solid #fff' : '2px solid #fff';
  const shadow = isSelected
    ? '0 0 0 3px rgba(22,163,74,0.35),0 2px 6px rgba(0,0,0,0.3)'
    : isHovered
      ? `0 0 0 2px ${baseColor}33,0 1px 4px rgba(0,0,0,0.25)`
      : '0 1px 3px rgba(0,0,0,0.25)';

  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:${border};box-shadow:${shadow};"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/* ── Individual stop marker ────────────────────────────────────────────── */

const StopMarkerItem = memo(function StopMarkerItem({
  stop,
  isSelected,
  onStopSelect,
}: {
  stop: TransitStop;
  isSelected: boolean;
  onStopSelect: (stop: TransitStop) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const dominantType = getDominantType(stop.types ?? []);
  const icon = buildStopIcon(dominantType, isSelected, hovered);

  return (
    <Marker
      position={[stop.lat, stop.lng]}
      icon={icon}
      riseOnHover={true}
      eventHandlers={{
        mouseover: () => setHovered(true),
        mouseout: () => setHovered(false),
        click: () => onStopSelect(stop),
      }}
    >
      <Tooltip direction="top" offset={[0, -4]} className="stop-tooltip" opacity={isSelected ? 0 : 1}>
        {stop.name}
      </Tooltip>
    </Marker>
  );
});

/* ── Main component ────────────────────────────────────────────────────── */

export default function StopMarkers({ onStopSelect, selectedStopId }: StopMarkersProps) {
  const map = useMap();
  const zoom = map.getZoom();
  const { stops } = useStops();

  const handleSelect = useCallback(
    (stop: TransitStop) => onStopSelect(stop),
    [onStopSelect],
  );

  if (zoom < STOP_ZOOM_THRESHOLD) return null;

  return (
    <>
      {stops.map((stop) => (
        <StopMarkerItem
          key={stop.id}
          stop={stop}
          isSelected={stop.id === selectedStopId}
          onStopSelect={handleSelect}
        />
      ))}
    </>
  );
}
