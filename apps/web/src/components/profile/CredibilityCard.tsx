import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { transitApi } from '../../lib/transit-api';
import { getCredibilityTier } from '../../lib/credibility';

export default function CredibilityCard() {
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    transitApi
      .getMe()
      .then((me) => setScore(me.credibilityScore))
      .catch(() => setError(true));
  }, []);

  const tier = score != null ? getCredibilityTier(score) : null;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <ShieldCheck size={18} color="#1A1A2E" strokeWidth={2} />
        <h2 style={styles.cardTitle}>Credibility</h2>
      </div>

      {error && <div style={styles.muted}>Could not load credibility.</div>}

      {!error && (
        <>
          <div style={styles.scoreRow}>
            <span style={styles.scoreLabel}>Score</span>
            <span style={styles.scoreValue}>{score ?? '—'}</span>
          </div>

          <div style={styles.divider} />

          <div style={styles.scoreRow}>
            <span style={styles.scoreLabel}>Tier</span>
            {tier ? (
              <span
                style={{
                  ...styles.badge,
                  color: tier.color,
                  backgroundColor: tier.background,
                }}
              >
                {tier.label}
              </span>
            ) : (
              <span style={styles.muted}>—</span>
            )}
          </div>

          <p style={styles.hint}>
            Build credibility by submitting accurate reports that other
            passengers confirm.
          </p>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#1A1A2E',
    letterSpacing: '-0.2px',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 600,
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
  },
  hint: {
    margin: '12px 0 0 0',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 1.4,
  },
  muted: {
    fontSize: 13,
    color: '#6B7280',
  },
};
