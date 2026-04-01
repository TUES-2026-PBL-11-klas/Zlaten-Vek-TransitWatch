import { memo, useState, useCallback } from 'react';
import L from 'leaflet';
import { Marker, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { useVehicles } from '../../hooks/useVehicles';
import { useLines } from '../../hooks/useLines';
import { TRANSIT_COLORS } from '../../types/transit';
import type { VehiclePosition, TransitLine } from '../../types/transit';

interface VehicleMarkersProps {
  onVehicleSelect: (vehicle: VehiclePosition) => void;
  selectedVehicleId: string | null;
}

/* ── Badge icon for zoom >= 16 ─────────────────────────────────────────── */

function buildVehicleBadgeIcon(line: TransitLine | undefined, bearing: number | null): L.DivIcon {
  const color = line?.color ? `#${line.color}` : (TRANSIT_COLORS[line?.type ?? ''] ?? '#6B7280');
  const name = line?.name ?? '?';

  const bearingHtml =
    bearing !== null
      ? `<div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:6px solid ${color};position:absolute;top:-8px;left:50%;transform:translateX(-50%) rotate(${bearing}deg);"></div>`
      : '';

  return L.divIcon({
    className: 'vehicle-icon',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        ${bearingHtml}
        <div style="display:flex;align-items:center;justify-content:center;padding:2px 7px;border-radius:10px;border:2px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,0.25);background:${color};white-space:nowrap;">
          <span style="font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:700;color:#fff;line-height:1;">${name}</span>
        </div>
      </div>
    `,
    iconSize: [36, 24],
    iconAnchor: [18, 12],
  });
}

/* ── Badge marker (zoom >= 16) ─────────────────────────────────────────── */

const VehicleBadgeMarker = memo(function VehicleBadgeMarker({
  vehicle,
  line,
  isSelected,
  onVehicleSelect,
}: {
  vehicle: VehiclePosition;
  line: TransitLine | undefined;
  isSelected: boolean;
  onVehicleSelect: (v: VehiclePosition) => void;
}) {
  const icon = buildVehicleBadgeIcon(line, vehicle.bearing);

  return (
    <Marker
      position={[vehicle.lat, vehicle.lng]}
      icon={icon}
      eventHandlers={{ click: () => onVehicleSelect(vehicle) }}
    >
      {line && !isSelected && (
        <Tooltip direction="top" offset={[0, -14]} className="map-tooltip">
          {line.name}
        </Tooltip>
      )}
    </Marker>
  );
});

/* ── Circle marker (zoom 10–15) ────────────────────────────────────────── */

const VehicleCircle = memo(function VehicleCircle({
  vehicle,
  line,
  isSelected,
  onVehicleSelect,
}: {
  vehicle: VehiclePosition;
  line: TransitLine | undefined;
  isSelected: boolean;
  onVehicleSelect: (v: VehiclePosition) => void;
}) {
  const color = line?.color ? `#${line.color}` : (TRANSIT_COLORS[line?.type ?? ''] ?? '#6B7280');

  return (
    <CircleMarker
      center={[vehicle.lat, vehicle.lng]}
      radius={isSelected ? 7 : 5}
      pathOptions={{
        fillColor: color,
        fillOpacity: 0.9,
        color: '#ffffff',
        weight: 2,
      }}
      eventHandlers={{ click: () => onVehicleSelect(vehicle) }}
    >
      {line && !isSelected && (
        <Tooltip direction="top" className="map-tooltip">
          {line.name}
        </Tooltip>
      )}
    </CircleMarker>
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

  // Tier 1: hidden at low zoom
  if (zoom < 10) return null;

  // Viewport culling — only render vehicles within padded bounds
  const paddedBounds = bounds.pad(0.1);
  const visibleVehicles = vehicles.filter((v) =>
    paddedBounds.contains([v.lat, v.lng]),
  );

  // Tier 2: circles at medium zoom
  if (zoom < 16) {
    return (
      <>
        {visibleVehicles.map((vehicle) => {
          const line = linesByGtfsId.get(vehicle.routeGtfsId);
          return (
            <VehicleCircle
              key={vehicle.vehicleId}
              vehicle={vehicle}
              line={line}
              isSelected={vehicle.vehicleId === selectedVehicleId}
              onVehicleSelect={onVehicleSelect}
            />
          );
        })}
      </>
    );
  }

  // Tier 3: badge icons at high zoom
  return (
    <>
      {visibleVehicles.map((vehicle) => {
        const line = linesByGtfsId.get(vehicle.routeGtfsId);
        return (
          <VehicleBadgeMarker
            key={vehicle.vehicleId}
            vehicle={vehicle}
            line={line}
            isSelected={vehicle.vehicleId === selectedVehicleId}
            onVehicleSelect={onVehicleSelect}
          />
        );
      })}
    </>
  );
}
