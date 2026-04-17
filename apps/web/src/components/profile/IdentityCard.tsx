import { useState, useEffect } from 'react';
import { UserCircle, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: checked ? '#16A34A' : '#E5E7EB',
        position: 'relative',
        flexShrink: 0,
        transition: 'background-color 0.2s',
        opacity: disabled ? 0.6 : 1,
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s',
          display: 'block',
        }}
      />
    </button>
  );
}

function generateAnonymousId() {
  return `TW ${Math.floor(Math.random() * 900) + 100}`;
}

export default function IdentityCard() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonymousId, setAnonymousId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;

      setEmail(user.email ?? '');
      setUsername(
        user.user_metadata?.username ?? user.email?.split('@')[0] ?? 'user',
      );
      setIsAnonymous(user.user_metadata?.is_anonymous ?? false);

      if (user.user_metadata?.anonymous_id) {
        setAnonymousId(user.user_metadata.anonymous_id);
      } else {
        const newId = generateAnonymousId();
        setAnonymousId(newId);
        await supabase.auth.updateUser({ data: { anonymous_id: newId } });
      }
    });
  }, []);

  async function handleAnonymousToggle(value: boolean) {
    setIsAnonymous(value);
    setSaving(true);
    await supabase.auth.updateUser({
      data: { is_anonymous: value, anonymous_id: anonymousId },
    });
    setSaving(false);
  }

  const displayName = isAnonymous ? anonymousId : username;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <UserCircle size={18} color="#1A1A2E" strokeWidth={2} />
        <h2 style={styles.cardTitle}>Identity</h2>
      </div>

      <div style={styles.field}>
        <span style={styles.fieldLabel}>Email</span>
        <span style={styles.fieldValue}>{email || '—'}</span>
      </div>

      <div style={styles.divider} />

      <div style={styles.field}>
        <span style={styles.fieldLabel}>Display name</span>
        <span style={{ ...styles.fieldValue, fontWeight: 600 }}>
          {displayName || '—'}
        </span>
      </div>

      <div style={styles.divider} />

      <div style={styles.toggleRow}>
        <div style={styles.toggleInfo}>
          <EyeOff size={16} color="#6B7280" strokeWidth={2} />
          <div>
            <div style={styles.toggleLabel}>Anonymous mode</div>
            <div style={styles.toggleDesc}>
              Reports show as{' '}
              <span style={{ color: '#1A1A2E', fontWeight: 500 }}>
                {anonymousId}
              </span>{' '}
              instead of your username
            </div>
          </div>
        </div>
        <Toggle
          checked={isAnonymous}
          onChange={handleAnonymousToggle}
          disabled={saving}
        />
      </div>
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
    gap: 0,
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
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '12px 0',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  fieldValue: {
    fontSize: 15,
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '12px 0',
  },
  toggleInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: '#111827',
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 1.4,
  },
};
