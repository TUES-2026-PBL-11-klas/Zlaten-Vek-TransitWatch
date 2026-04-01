import { memo, useState, useCallback } from 'react';
import L from 'leaflet';
import { Marker, useMap, useMapEvents } from 'react-leaflet';
import { useVehicles } from '../../hooks/useVehicles';
import { useLines } from '../../hooks/useLines';
import { TRANSIT_COLORS } from '../../types/transit';
import type { VehiclePosition, TransitLine } from '../../types/transit';

interface VehicleMarkersProps {
  onVehicleSelect: (vehicle: VehiclePosition) => void;
  selectedVehicleId: string | null;
}

/* ── Tiny SVG transit-type symbols (white, for inside colored badge) ──── */

const TYPE_ICON_SVG: Record<string, string> = {
  bus: `<svg viewBox="0 0 12 12" width="10" height="10" style="margin-right:2px;flex-shrink:0;vertical-align:middle"><rect x="1" y="1.5" width="10" height="7" rx="1.5" fill="#fff" opacity=".85"/><rect x="2.5" y="2.5" width="7" height="3" rx=".8" fill="#fff" opacity=".35"/><circle cx="3.5" cy="10" r=".9" fill="#fff" opacity=".85"/><circle cx="8.5" cy="10" r=".9" fill="#fff" opacity=".85"/></svg>`,
  tram: `<svg viewBox="0 0 12 12" width="10" height="10" style="margin-right:2px;flex-shrink:0;vertical-align:middle"><line x1="4" y1="0" x2="6" y2="2" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".85"/><line x1="8" y1="0" x2="6" y2="2" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".85"/><rect x="2.5" y="2" width="7" height="7" rx="1.5" fill="#fff" opacity=".85"/><rect x="3.5" y="3.5" width="5" height="2.5" rx=".8" fill="#fff" opacity=".35"/><circle cx="4.5" cy="10.5" r=".7" fill="#fff" opacity=".85"/><circle cx="7.5" cy="10.5" r=".7" fill="#fff" opacity=".85"/></svg>`,
  metro: `<svg viewBox="0 0 12 12" width="10" height="10" style="margin-right:2px;flex-shrink:0;vertical-align:middle"><text x="6" y="9.5" text-anchor="middle" font-size="9" font-weight="900" font-family="sans-serif" fill="#fff" opacity=".9">M</text></svg>`,
  trolley: `<svg viewBox="0 0 12 12" width="10" height="10" style="margin-right:2px;flex-shrink:0;vertical-align:middle"><line x1="3" y1="0" x2="5" y2="2" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".85"/><line x1="9" y1="0" x2="7" y2="2" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".85"/><rect x="1.5" y="2" width="9" height="7" rx="1.5" fill="#fff" opacity=".85"/><rect x="3" y="3.5" width="6" height="2.5" rx=".8" fill="#fff" opacity=".35"/><circle cx="4" cy="10.5" r=".7" fill="#fff" opacity=".85"/><circle cx="8" cy="10.5" r=".7" fill="#fff" opacity=".85"/></svg>`,
};

/* ── Badge icon builder (used at ALL zoom levels) ──────────────────────── */

function buildVehicleIcon(
  line: TransitLine | undefined,
  vehicle: VehiclePosition,
  bearing: number | null,
  size: 'sm' | 'md' | 'lg',
): L.DivIcon {
  const type = line?.type ?? (vehicle.routeType as TransitLine['type']) ?? undefined;
  const color = line?.color ? `#${line.color}` : (TRANSIT_COLORS[type ?? ''] ?? '#6B7280');
  const name = line?.name ?? vehicle.routeShortName ?? '?';

  const cfg = {
    sm:  { fontSize: 9,  px: 4, py: 1, radius: 8,  border: 1.5, arrow: 4, shadow: '0 1px 4px' },
    md:  { fontSize: 10, px: 5, py: 2, radius: 9,  border: 2,   arrow: 5, shadow: '0 2px 6px' },
    lg:  { fontSize: 12, px: 7, py: 3, radius: 10, border: 2,   arrow: 6, shadow: '0 2px 8px' },
  }[size];

  // Only show type icon at md/lg sizes
  const typeSvg = size !== 'sm' ? (TYPE_ICON_SVG[type ?? ''] ?? '') : '';

  const arrowSize = cfg.arrow;
  const bearingHtml =
    bearing !== null
      ? `<div style="width:0;height:0;border-left:${arrowSize}px solid transparent;border-right:${arrowSize}px solid transparent;border-bottom:${arrowSize + 2}px solid ${color};position:absolute;top:-${arrowSize + 4}px;left:50%;transform:translateX(-50%) rotate(${bearing}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,.2));"></div>`
      : '';

  return L.divIcon({
    className: 'vehicle-icon',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        ${bearingHtml}
        <div style="display:flex;align-items:center;justify-content:center;padding:${cfg.py}px ${cfg.px}px;border-radius:${cfg.radius}px;border:${cfg.border}px solid #fff;box-shadow:${cfg.shadow} rgba(15,23,42,0.25);background:${color};white-space:nowrap;">
          ${typeSvg}
          <span style="font-family:Inter,system-ui,sans-serif;font-size:${cfg.fontSize}px;font-weight:700;color:#fff;line-height:1;">${name}</span>
        </div>
      </div>
    `,
    iconSize: [48, 28],
    iconAnchor: [24, 14],
  });
}

/* ── Single vehicle marker (all zoom levels) ──────────────────────────── */

const VehicleMarkerItem = memo(function VehicleMarkerItem({
  vehicle,
  line,
  isSelected,
  size,
  onVehicleSelect,
}: {
  vehicle: VehiclePosition;
  line: TransitLine | undefined;
  isSelected: boolean;
  size: 'sm' | 'md' | 'lg';
  onVehicleSelect: (v: VehiclePosition) => void;
}) {
  const icon = buildVehicleIcon(line, vehicle, vehicle.bearing, isSelected ? 'lg' : size);

  return (
    <Marker
      position={[vehicle.lat, vehicle.lng]}
      icon={icon}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{ click: () => onVehicleSelect(vehicle) }}
    />
  );
});

/* ── Main component ────────────────────────────────────────────────────── */

export default function VehicleMarkers({ onVehicleSelect, selectedVehicleId }: VehicleMarkersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [bounds, setBounds] = useState(map.getBounds());

  const updateView = useCallback(() => {
    setZoom(map.getZoom());
    setBounds(map.getBounds());
  }, [map]);

  useMapEvents({
    moveend: updateView,
    zoomend: updateView,
  });

  const { vehicles } = useVehicles();
  const { linesByGtfsId } = useLines();

  // Hidden at very low zoom
  if (zoom < 10) return null;

  // Viewport culling
  const paddedBounds = bounds.pad(0.1);
  const visibleVehicles = vehicles.filter((v) =>
    paddedBounds.contains([v.lat, v.lng]),
  );

  // Pick badge size based on zoom
  const size: 'sm' | 'md' | 'lg' = zoom >= 16 ? 'lg' : zoom >= 13 ? 'md' : 'sm';

  return (
    <>
      {visibleVehicles.map((vehicle) => {
        const line = linesByGtfsId.get(vehicle.routeGtfsId);
        return (
          <VehicleMarkerItem
            key={vehicle.vehicleId}
            vehicle={vehicle}
            line={line}
            isSelected={vehicle.vehicleId === selectedVehicleId}
            size={size}
            onVehicleSelect={onVehicleSelect}
          />
        );
      })}
    </>
  );
}
