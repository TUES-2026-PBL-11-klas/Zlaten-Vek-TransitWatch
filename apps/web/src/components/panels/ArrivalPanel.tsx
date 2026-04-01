import { useEffect, useState } from 'react';
import { useArrivals } from '../../hooks/useArrivals';
import { TRANSIT_COLORS } from '../../types/transit';
import './panels.css';

interface ArrivalPanelProps {
  stopId: string;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  bus: 'Автобус',
  tram: 'Трамвай',
  trolley: 'Тролей',
  metro: 'Метро',
};

function SkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid #E5E7EB',
      }}
    >
      <div className="skeleton" style={{ width: 40, height: 24, borderRadius: 12 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 6 }} />
        <div className="skeleton" style={{ width: '40%', height: 12 }} />
      </div>
      <div className="skeleton" style={{ width: 36, height: 28 }} />
    </div>
  );
}

function DelayBadge({ delayMinutes }: { delayMinutes: number }) {
  if (delayMinutes <= 0) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#16A34A' }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#16A34A',
            display: 'inline-block',
          }}
        />
        Навреме
      </span>
    );
  }
  const color = delayMinutes <= 5 ? '#F59E0B' : '#DC2626';
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
        }}
      />
      +{delayMinutes}мин
    </span>
  );
}

export default function ArrivalPanel({ stopId, onClose }: ArrivalPanelProps) {
  const { arrivals, stopName, loading, error } = useArrivals(stopId);
  const [open, setOpen] = useState(false);

  // Trigger slide-in animation
  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`panel-container${open ? ' open' : ''}`}>
      <div className="panel">
        <div className="panel-handle" />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '16px 20px 12px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
              {stopName || '—'}
            </h2>
            {!loading && arrivals.length > 0 && (
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>
                {arrivals.length} линии
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#6B7280',
              fontSize: 20,
              lineHeight: 1,
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ height: 1, background: '#E5E7EB', margin: '0 20px' }} />

        {/* Content */}
        <div style={{ padding: '4px 20px 20px' }}>
          {error && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: '12px 16px',
                marginTop: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <span style={{ color: '#DC2626', fontSize: 14 }}>{error}</span>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: '#DC2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Опитай пак
              </button>
            </div>
          )}

          {loading && !error && (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}

          {!loading && !error && arrivals.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 0',
                color: '#6B7280',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 8 }}>🚌</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                Няма предстоящи пристигания
              </p>
            </div>
          )}

          {!loading && !error && arrivals.map((arrival, i) => {
            const dotColor =
              arrival.lineColor
                ? `#${arrival.lineColor}`
                : (TRANSIT_COLORS[arrival.lineType] ?? '#6B7280');
            const isDelayed = arrival.delayMinutes > 0;

            return (
              <div
                key={`${arrival.tripId}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 0',
                  borderBottom: i < arrivals.length - 1 ? '1px solid #F3F4F6' : 'none',
                }}
              >
                {/* Line badge */}
                <div
                  style={{
                    background: dotColor,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    borderRadius: 12,
                    padding: '3px 10px',
                    minWidth: 36,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {arrival.lineName}
                </div>

                {/* Type + delay */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 3 }}>
                    {TYPE_LABELS[arrival.lineType] ?? arrival.lineType}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DelayBadge delayMinutes={arrival.delayMinutes} />
                    {isDelayed && (
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                        <span style={{ textDecoration: 'line-through' }}>{arrival.scheduledTime}</span>
                        {' → '}
                        <span style={{ color: '#F59E0B' }}>{arrival.estimatedTime}</span>
                      </span>
                    )}
                    {!isDelayed && (
                      <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                        {arrival.scheduledTime}
                      </span>
                    )}
                  </div>
                </div>

                {/* Countdown */}
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 20,
                    color: '#111827',
                    flexShrink: 0,
                    minWidth: 48,
                    textAlign: 'right',
                  }}
                >
                  {arrival.minutesUntil}
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#6B7280' }}>мин</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
