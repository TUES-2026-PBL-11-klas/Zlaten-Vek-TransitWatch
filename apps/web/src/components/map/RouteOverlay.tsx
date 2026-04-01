import { CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import { TRANSIT_COLORS } from '../../types/transit';
import type { TripTimeline, ShapeData } from '../../types/transit';

interface RouteOverlayProps {
  timeline: TripTimeline;
  shape: ShapeData | null;
}

export default function RouteOverlay({ timeline, shape }: RouteOverlayProps) {
  const lineColor =
    timeline.lineColor
      ? `#${timeline.lineColor}`
      : (TRANSIT_COLORS[timeline.lineType] ?? '#6B7280');

  return (
    <>
      {/* Route polyline */}
      {shape && shape.coordinates.length > 0 && (
        <>
          <Polyline
            positions={shape.coordinates}
            pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.65 }}
          />
          <Polyline
            positions={shape.coordinates}
            pathOptions={{ color: lineColor, weight: 4, opacity: 0.85 }}
          />
        </>
      )}

      {/* Trip stop dots */}
      {timeline.stops.map((stop) => {
        const isPassed = stop.status === 'passed';
        const isNext = stop.status === 'next';

        const fillColor = isPassed ? '#9CA3AF' : isNext ? '#16A34A' : '#F8FAFC';
        const strokeColor = isPassed ? '#6B7280' : isNext ? '#15803D' : lineColor;
        const radius = isNext ? 7 : 5;

        return (
          <CircleMarker
            key={stop.stopId}
            center={[stop.lat, stop.lng]}
            radius={radius}
            pathOptions={{
              fillColor,
              fillOpacity: 1,
              color: strokeColor,
              weight: 2,
              className: isNext ? 'pulse-marker' : undefined,
            }}
          >
            <Tooltip direction="top" className="map-tooltip">
              <span style={{ fontWeight: 500 }}>{stop.stopName}</span>
              <br />
              {isPassed ? (
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{stop.estimatedTime}</span>
              ) : (
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  <span style={{ fontWeight: 600, color: stop.minutesUntil <= 2 ? '#DC2626' : '#111827' }}>
                    {stop.minutesUntil === 0 ? 'сега' : `${stop.minutesUntil} мин`}
                  </span>
                  {' · '}{stop.estimatedTime}
                  {stop.delayMinutes > 0 && (
                    <span style={{ color: stop.delayMinutes > 5 ? '#DC2626' : '#F59E0B', marginLeft: 4 }}>
                      +{stop.delayMinutes}мин
                    </span>
                  )}
                </span>
              )}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
