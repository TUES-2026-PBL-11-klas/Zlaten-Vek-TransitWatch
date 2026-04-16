import { Popup } from 'react-leaflet';
import { useArrivals } from '../../hooks/useArrivals';
import { TRANSIT_COLORS } from '../../types/transit';

const TYPE_LABELS: Record<string, string> = {
  bus: 'Автобус',
  tram: 'Трамвай',
  trolley: 'Тролей',
  metro: 'Метро',
};

interface SelectedStop {
  id: string;
  lat: number;
  lng: number;
}

interface StopPopupProps {
  selectedStop: SelectedStop | null;
  onClose: () => void;
}

function SkeletonArrivalRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 0',
        borderBottom: '1px solid #F3F4F6',
      }}
    >
      <div className="skeleton" style={{ width: 36, height: 22, borderRadius: 10 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '55%', height: 12, marginBottom: 4 }} />
        <div className="skeleton" style={{ width: '35%', height: 10 }} />
      </div>
      <div className="skeleton" style={{ width: 40, height: 20, borderRadius: 6 }} />
    </div>
  );
}

export function StopPopupContent({ stopId, onClose }: { stopId: string; onClose: () => void }) {
  const { arrivals, stopName, loading, error } = useArrivals(stopId);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '14px 16px 10px',
          borderBottom: '1px solid #F3F4F6',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 2,
            }}
          >
            Спирка
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
            {stopName || '—'}
          </div>
          {!loading && arrivals.length > 0 && (
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {arrivals.length} линии в следващите 2 часа
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: '#F3F4F6',
            border: 'none',
            cursor: 'pointer',
            width: 24,
            height: 24,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6B7280',
            fontSize: 13,
            flexShrink: 0,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Arrivals list */}
      <div className="popup-scroll" style={{ padding: '2px 16px 8px' }}>
        {error && (
          <div style={{ padding: '12px 0', color: '#DC2626', fontSize: 13, textAlign: 'center' }}>
            Грешка при зареждане
          </div>
        )}

        {loading && !error && (
          <>
            <SkeletonArrivalRow />
            <SkeletonArrivalRow />
            <SkeletonArrivalRow />
          </>
        )}

        {!loading && !error && arrivals.length === 0 && (
          <div style={{ padding: '16px 0', color: '#6B7280', fontSize: 13, textAlign: 'center' }}>
            Няма предстоящи пристигания
          </div>
        )}

        {!loading &&
          !error &&
          arrivals.slice(0, 6).map((arrival, i) => {
            const dotColor = arrival.lineColor
              ? `#${arrival.lineColor}`
              : (TRANSIT_COLORS[arrival.lineType] ?? '#6B7280');
            const isLast = i === Math.min(arrivals.length, 6) - 1;

            return (
              <div
                key={`${arrival.tripId}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
                }}
              >
                {/* Line badge */}
                <div
                  style={{
                    background: dotColor,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 12,
                    borderRadius: 10,
                    padding: '3px 8px',
                    minWidth: 32,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {arrival.lineName}
                </div>

                {/* Type + delay */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {TYPE_LABELS[arrival.lineType] ?? arrival.lineType}
                  </div>
                  {arrival.delayMinutes > 0 ? (
                    <div style={{ fontSize: 11, color: arrival.delayMinutes > 5 ? '#DC2626' : '#F59E0B' }}>
                      <span style={{ textDecoration: 'line-through', color: '#9CA3AF', marginRight: 3 }}>
                        {arrival.scheduledTime}
                      </span>
                      {arrival.estimatedTime}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{arrival.scheduledTime}</div>
                  )}
                </div>

                {/* Countdown */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: arrival.minutesUntil <= 2 ? '#DC2626' : '#111827',
                      lineHeight: 1,
                    }}
                  >
                    {arrival.minutesUntil === 0 ? 'сега' : `${arrival.minutesUntil}`}
                  </span>
                  {arrival.minutesUntil > 0 && (
                    <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>мин</span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default function StopPopup({ selectedStop, onClose }: StopPopupProps) {
  if (!selectedStop) return null;

  return (
    <Popup
      position={[selectedStop.lat, selectedStop.lng]}
      className="transit-popup stop-popup"
      closeButton={false}
      offset={[0, -8]}
      autoPan={false}
      eventHandlers={{ remove: onClose }}
    >
      <StopPopupContent stopId={selectedStop.id} onClose={onClose} />
    </Popup>
  );
}
