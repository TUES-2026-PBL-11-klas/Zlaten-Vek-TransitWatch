import { useEffect, useState } from 'react';
import { TRANSIT_COLORS } from '../../types/transit';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import type { TripTimeline } from '../../types/transit';
import './panels.css';

interface TripTimelinePanelProps {
  timeline: TripTimeline | null;
  loading?: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  bus: 'Автобус',
  tram: 'Трамвай',
  trolley: 'Тролей',
  metro: 'Метро',
};

export default function TripTimelinePanel({ timeline, loading, onClose }: TripTimelinePanelProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 300);
  };

  const { handlers: swipeHandlers } = useSwipeToDismiss({ onDismiss: handleClose });

  const lineColor =
    timeline?.lineColor
      ? `#${timeline.lineColor}`
      : (timeline ? (TRANSIT_COLORS[timeline.lineType] ?? '#6B7280') : '#6B7280');

  const firstStop = timeline?.stops[0];
  const lastStop = timeline ? timeline.stops[timeline.stops.length - 1] : undefined;

  return (
    <div className={`panel-container${open ? ' open' : ''}`}>
      <div className="panel" {...swipeHandlers}>
        <div className="panel-header">
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
            {loading || !timeline ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ width: 140, height: 18, background: '#E5E7EB', borderRadius: 4 }} />
                <div style={{ width: 200, height: 13, background: '#F3F4F6', borderRadius: 4 }} />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: lineColor,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>
                    {TYPE_LABELS[timeline.lineType] ?? timeline.lineType} {timeline.lineName}
                  </h2>
                </div>
                {firstStop && lastStop && (
                  <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
                    {firstStop.stopName} → {lastStop.stopName}
                  </p>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
        </div>

        {/* Loading skeleton */}
        {(loading || !timeline) && (
          <div style={{ padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[80, 120, 100, 140, 90].map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E5E7EB', flexShrink: 0 }} />
                <div style={{ width: w, height: 13, background: '#F3F4F6', borderRadius: 4 }} />
                <div style={{ marginLeft: 'auto', width: 36, height: 13, background: '#F3F4F6', borderRadius: 4 }} />
              </div>
            ))}
          </div>
        )}

        {/* Timeline */}
        {timeline && <div style={{ padding: '8px 20px 20px' }}>
          {timeline.stops.map((stop, i) => {
            const isPassed = stop.status === 'passed';
            const isNext = stop.status === 'next';
            const isLast = i === timeline.stops.length - 1;

            const dotColor = isPassed ? '#9CA3AF' : isNext ? '#16A34A' : '#FFFFFF';
            const dotBorder = isPassed ? '#9CA3AF' : isNext ? '#16A34A' : lineColor;
            const dotSize = isNext ? 12 : 8;
            const nameColor = isPassed ? '#9CA3AF' : '#111827';
            const timeColor = isPassed ? '#9CA3AF' : '#6B7280';

            return (
              <div key={stop.stopId} style={{ display: 'flex', gap: 12 }}>
                {/* Timeline line + dot */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                    width: 16,
                    paddingTop: 14,
                  }}
                >
                  <div
                    className={isNext ? 'pulse-marker' : undefined}
                    style={{
                      width: dotSize,
                      height: dotSize,
                      borderRadius: '50%',
                      background: dotColor,
                      border: `2px solid ${dotBorder}`,
                      flexShrink: 0,
                    }}
                  />
                  {!isLast && (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        minHeight: 16,
                        background: isPassed ? '#D1D5DB' : lineColor,
                        opacity: isPassed ? 0.5 : 0.6,
                        marginTop: 2,
                      }}
                    />
                  )}
                </div>

                {/* Stop info */}
                <div style={{ flex: 1, paddingBottom: isLast ? 0 : 4, paddingTop: 10 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: isNext ? 600 : 400,
                        color: nameColor,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {stop.stopName}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                      {isPassed ? (
                        <span style={{ fontSize: 12, color: timeColor }}>{stop.estimatedTime}</span>
                      ) : (
                        <>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: stop.minutesUntil <= 2 ? '#DC2626' : isNext ? '#16A34A' : '#111827',
                            }}
                          >
                            {stop.minutesUntil === 0 ? 'сега' : `${stop.minutesUntil} мин`}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: stop.delayMinutes > 0 ? (stop.delayMinutes > 5 ? '#DC2626' : '#F59E0B') : '#9CA3AF',
                            }}
                          >
                            {stop.delayMinutes > 0 && (
                              <span style={{ textDecoration: 'line-through', marginRight: 3 }}>{stop.scheduledTime}</span>
                            )}
                            {stop.estimatedTime}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {isNext && (
                    <div style={{ marginTop: 2 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#16A34A',
                          background: '#DCFCE7',
                          borderRadius: 4,
                          padding: '1px 6px',
                        }}
                      >
                        следваща спирка
                      </span>
                    </div>
                  )}
                  {isPassed && (
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>отминала</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>}
      </div>
    </div>
  );
}
