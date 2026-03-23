import { memo } from 'react';
import L from 'leaflet';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import { useVehicles } from '../../hooks/useVehicles';
import { useLines } from '../../hooks/useLines';
import { TRANSIT_COLORS } from '../../types/transit';
import type { VehiclePosition, TransitLine } from '../../types/transit';

interface VehicleMarkersProps {
  onVehicleSelect: (vehicle: VehiclePosition) => void;
}

function buildVehicleIcon(line: TransitLine | undefined, bearing: number | null, showLabel: boolean): L.DivIcon {
  const color = line?.color ? `#${line.color}` : (TRANSIT_COLORS[line?.type ?? ''] ?? '#6B7280');
  const bearingHtml =
    bearing !== null
      ? `<div class="vehicle-bearing" style="color:${color};transform:translateX(-50%) rotate(${bearing}deg);"></div>`
      : '';
  const labelHtml =
    showLabel && line
      ? `<div class="vehicle-label" style="color:${color};">${line.name}</div>`
      : '';

  return L.divIcon({
    className: 'vehicle-icon',
    html: `
      <div style="position:relative;width:18px;height:18px;">
        ${bearingHtml}
        <div class="vehicle-dot" style="background:${color};"></div>
        ${labelHtml}
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const VehicleMarker = memo(function VehicleMarker({
  vehicle,
  line,
  showLabel,
  onVehicleSelect,
}: {
  vehicle: VehiclePosition;
  line: TransitLine | undefined;
  showLabel: boolean;
  onVehicleSelect: (v: VehiclePosition) => void;
}) {
  const icon = buildVehicleIcon(line, vehicle.bearing, showLabel);

  return (
    <Marker
      key={vehicle.vehicleId}
      position={[vehicle.lat, vehicle.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onVehicleSelect(vehicle),
      }}
    >
      {line && (
        <Tooltip direction="top" offset={[0, -10]}>
          {line.name}
        </Tooltip>
      )}
    </Marker>
  );
});

export default function VehicleMarkers({ onVehicleSelect }: VehicleMarkersProps) {
  const map = useMap();
  const zoom = map.getZoom();
  const { vehicles } = useVehicles();
  const { linesByGtfsId } = useLines();
  const showLabel = zoom >= 15;

  return (
    <>
      {vehicles.map((vehicle) => {
        const line = linesByGtfsId.get(vehicle.routeGtfsId);
        return (
          <VehicleMarker
            key={vehicle.vehicleId}
            vehicle={vehicle}
            line={line}
            showLabel={showLabel}
            onVehicleSelect={onVehicleSelect}
          />
        );
      })}
    </>
  );
}
