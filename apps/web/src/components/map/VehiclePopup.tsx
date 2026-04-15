import { Popup } from 'react-leaflet';
import { TRANSIT_COLORS } from '../../types/transit';
import { useLines } from '../../hooks/useLines';
import { useActiveReports } from '../../hooks/useActiveReports';
import { getCredibilityTier, UNVERIFIED_THRESHOLD } from '../../lib/credibility';
import type { VehiclePosition, TripTimeline } from '../../types/transit';

const TYPE_LABELS: Record<string, string> = {
  bus: 'Автобус',
  tram: 'Трамвай',
  trolley: 'Тролей',
  metro: 'Метро',
};

interface VehiclePopupProps {
  vehicle: VehiclePosition;
  timeline: TripTimeline | null;
  loading: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  VEHICLE_ISSUE: '\u{1F6A8}',
  TRAFFIC: '\u{23F1}\u{FE0F}',
  INSPECTORS: '\u{1F3AB}',
  SAFETY: '\u{26A0}\u{FE0F}',
  OTHER: '\u{2139}\u{FE0F}',
};

const CATEGORY_LABELS: Record<string, string> = {
  VEHICLE_ISSUE: 'Повреда',
  TRAFFIC: 'Трафик',
  INSPECTORS: 'Контрольори',
  SAFETY: 'Безопасност',
  OTHER: 'Друго',
};

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'изтекъл';
  const mins = Math.ceil(diff / 60_000);
  return `${mins} мин`;
}

export default function VehiclePopup({ vehicle, timeline, loading, onClose }: VehiclePopupProps) {
  const { linesByGtfsId } = useLines();
  const { reportsByVehicleId } = useActiveReports();
  const line = linesByGtfsId.get(vehicle.routeGtfsId);
  const vehicleReports = reportsByVehicleId.get(vehicle.vehicleId) ?? [];

  const lineColor = timeline?.lineColor
    ? `#${timeline.lineColor}`
    : line?.color
      ? `#${line.color}`
      : (TRANSIT_COLORS[line?.type ?? ''] ?? '#6B7280');

  const lineType = timeline?.lineType ?? line?.type ?? 'bus';
  const lineName = timeline?.lineName ?? line?.name ?? vehicle.routeGtfsId;

  const nextStop = timeline?.stops.find((s) => s.status === 'next') ?? null;

  return (
    <Popup
      position={[vehicle.lat, vehicle.lng]}
      className="transit-popup vehicle-popup"
      closeButton={false}
      offset={[0, -14]}
      autoPan={false}
      eventHandlers={{ remove: onClose }}
    >
      <div style={{ width: 248, fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px 10px',
            borderBottom: '1px solid #F3F4F6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: lineColor,
                display: 'inline-block',
                flexShrink: 0,
                boxShadow: `0 0 0 3px ${lineColor}22`,
              }}
            />
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', letterSpacing: '-0.2px' }}>
              {TYPE_LABELS[lineType] ?? lineType} {lineName}
            </span>
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

        {/* Body */}
        <div style={{ padding: '12px 16px 14px' }}>
          {loading ? (
            // Loading skeleton
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton" style={{ width: 90, height: 11, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 160, height: 15, borderRadius: 4 }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <div className="skeleton" style={{ width: 56, height: 32, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: 44, height: 16, borderRadius: 4 }} />
              </div>
            </div>
          ) : nextStop ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                Следваща спирка
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 10, lineHeight: 1.3 }}>
                {nextStop.stopName}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                {/* Countdown pill */}
                <div
                  style={{
                    background: nextStop.minutesUntil <= 2 ? '#FEE2E2' : '#F0FDF4',
                    color: nextStop.minutesUntil <= 2 ? '#DC2626' : '#16A34A',
                    fontWeight: 700,
                    fontSize: 22,
                    borderRadius: 8,
                    padding: '4px 10px',
                    lineHeight: 1,
                    letterSpacing: '-0.5px',
                  }}
                >
                  {nextStop.minutesUntil === 0 ? 'сега' : `${nextStop.minutesUntil}`}
                  {nextStop.minutesUntil > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 2 }}>мин</span>
                  )}
                </div>
                {/* Actual time + delay */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                    {nextStop.estimatedTime}
                  </span>
                  {nextStop.delayMinutes > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        color: nextStop.delayMinutes > 5 ? '#DC2626' : '#F59E0B',
                        fontWeight: 500,
                      }}
                    >
                      +{nextStop.delayMinutes} мин закъснение
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : !timeline ? (
            // Data unavailable (no error shown — backend may not support this trip)
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9CA3AF', fontSize: 13 }}>
              <span style={{ fontSize: 16 }}>—</span>
              <span>Данните за маршрута не са налични</span>
            </div>
          ) : (
            // All stops passed — end of route
            <div style={{ textAlign: 'center', padding: '8px 0', color: '#9CA3AF', fontSize: 13 }}>
              Края на маршрута
            </div>
          )}
        </div>

        {/* Active reports for this line */}
        {vehicleReports.length > 0 && (
          <div style={{ borderTop: '1px solid #F3F4F6' }}>
            <div style={{
              padding: '10px 16px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Доклади
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#DC2626',
                background: '#FEF2F2',
                padding: '2px 7px',
                borderRadius: 10,
              }}>
                {vehicleReports.length}
              </span>
            </div>
            <div className="popup-scroll" style={{ padding: '0 16px 12px' }}>
              {vehicleReports.map((report) => {
                const authorScore = report.user?.credibilityScore ?? 0;
                const tier = getCredibilityTier(authorScore);
                const unverified = authorScore < UNVERIFIED_THRESHOLD;
                return (
                <div
                  key={report.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    padding: '8px 0',
                    borderBottom: '1px solid #F9FAFB',
                  }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
                    {CATEGORY_ICONS[report.category] ?? '\u{2139}\u{FE0F}'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        {CATEGORY_LABELS[report.category] ?? report.category}
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: tier.color,
                        backgroundColor: tier.background,
                        padding: '1px 6px',
                        borderRadius: 999,
                      }}>
                        {tier.label}
                      </span>
                      {unverified && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 500,
                          color: '#9CA3AF',
                          border: '1px solid #E5E7EB',
                          padding: '1px 5px',
                          borderRadius: 999,
                        }}>
                          Непотвърден
                        </span>
                      )}
                    </div>
                    {report.description && (
                      <div style={{
                        fontSize: 11,
                        color: '#6B7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 1,
                      }}>
                        {report.description}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                      {timeRemaining(report.expiresAt)}
                    </div>
                  </div>
                  {report.photoUrl && (
                    <img
                      src={report.photoUrl}
                      alt=""
                      style={{
                        width: 32,
                        height: 32,
                        objectFit: 'cover',
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Popup>
  );
}
