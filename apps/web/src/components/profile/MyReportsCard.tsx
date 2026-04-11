import { useState } from 'react';
import { Flag, Trash2, Loader2 } from 'lucide-react';
import { useMyReports } from '../../hooks/useMyReports';
import { transitApi } from '../../lib/transit-api';

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'току-що';
  if (mins < 60) return `преди ${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `преди ${hours}ч`;
  const days = Math.floor(hours / 24);
  return `преди ${days}д`;
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'изтекъл';
  const mins = Math.ceil(diff / 60_000);
  if (mins < 60) return `${mins} мин`;
  return `${Math.floor(mins / 60)}ч ${mins % 60}мин`;
}

export default function MyReportsCard() {
  const { reports, loading, refetch } = useMyReports();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await transitApi.deleteReport(id);
      refetch();
    } catch (err) {
      console.error('Failed to delete report:', err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconWrap}>
            <Flag size={16} color="#16A34A" strokeWidth={2.2} />
          </div>
          <span style={styles.headerTitle}>Моите доклади</span>
        </div>
        {reports.length > 0 && (
          <span style={styles.badge}>{reports.length}</span>
        )}
      </div>

      {/* Body */}
      <div style={styles.body}>
        {loading ? (
          <div style={styles.centered}>
            <Loader2 size={20} color="#9CA3AF" className="animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 13, color: '#9CA3AF' }}>Нямате подадени доклади</div>
          </div>
        ) : (
          <div style={styles.list}>
            {reports.map((report) => {
              const isActive = report.status === 'active' && new Date(report.expiresAt).getTime() > Date.now();
              return (
                <div key={report.id} style={styles.item}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>
                    {CATEGORY_ICONS[report.category] ?? '\u{2139}\u{FE0F}'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                        {CATEGORY_LABELS[report.category] ?? report.category}
                      </span>
                      {report.line && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#6B7280',
                          background: '#F3F4F6',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}>
                          {report.line.name}
                        </span>
                      )}
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: isActive ? '#F0FDF4' : '#F9FAFB',
                        color: isActive ? '#16A34A' : '#9CA3AF',
                      }}>
                        {isActive ? timeRemaining(report.expiresAt) : 'изтекъл'}
                      </span>
                    </div>
                    {report.description && (
                      <div style={{
                        fontSize: 12,
                        color: '#6B7280',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {report.description}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      {timeAgo(report.createdAt)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(report.id)}
                    disabled={deletingId === report.id}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: deletingId === report.id ? 'not-allowed' : 'pointer',
                      color: '#DC2626',
                      opacity: deletingId === report.id ? 0.4 : 0.6,
                      padding: 6,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'opacity 160ms ease',
                    }}
                    onMouseEnter={(e) => { if (deletingId !== report.id) e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { if (deletingId !== report.id) e.currentTarget.style.opacity = '0.6'; }}
                    title="Изтрий"
                  >
                    {deletingId === report.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#F0FDF4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#111827',
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#16A34A',
    background: '#F0FDF4',
    padding: '2px 8px',
    borderRadius: 10,
  },
  body: {
    padding: '12px 20px 16px',
  },
  centered: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '24px 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 12px',
    background: '#F9FAFB',
    borderRadius: 10,
  },
};
