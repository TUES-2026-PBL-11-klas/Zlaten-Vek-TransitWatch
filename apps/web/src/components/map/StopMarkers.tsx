import { useCallback, useState, memo } from 'react';
import L from 'leaflet';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import { useStops } from '../../hooks/useStops';
import type { TransitStop } from '../../types/transit';

interface StopMarkersProps {
  onStopSelect: (stop: TransitStop) => void;
  selectedStopId: string | null;
}

/* ── "H" stop sign icon (HTML divs, same approach as RampMe) ───────────── */

function buildStopIcon(isSelected: boolean, isHovered: boolean): L.DivIcon {
  let signBg: string;
  let poleBg: string;
  let glow: string;

  if (isSelected) {
    signBg = '#16A34A';
    poleBg = '#16A34A';
    glow = '0 0 0 3px rgba(22,163,74,0.35),0 2px 8px rgba(0,0,0,0.4)';
  } else if (isHovered) {
    signBg = '#15803D';
    poleBg = '#6B7280';
    glow = '0 1px 4px rgba(0,0,0,0.3)';
  } else {
    signBg = '#1A1A2E';
    poleBg = '#4b5563';
    glow = '0 1px 4px rgba(0,0,0,0.25)';
  }

  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;width:20px;height:29px">
      <div style="background:${signBg};border-radius:3px;width:18px;height:13px;display:flex;align-items:center;justify-content:center;box-shadow:${glow};flex-shrink:0">
        <span style="color:#fff;font-size:9px;font-weight:900;font-family:sans-serif;line-height:1">H</span>
      </div>
      <div style="width:2px;flex:1;background:${poleBg}"></div>
      <div style="width:5px;height:5px;border-radius:50%;background:${poleBg};flex-shrink:0"></div>
    </div>`,
    iconSize: [20, 29],
    iconAnchor: [10, 29],
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
  const icon = buildStopIcon(isSelected, hovered);

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
      {!isSelected && (
        <Tooltip direction="top" offset={[0, -4]} className="stop-tooltip">
          {stop.name}
        </Tooltip>
      )}
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

  if (zoom < 15) return null;

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
