import { useState } from 'react';
import { SlidersHorizontal, Bus, Clock } from 'lucide-react';
import { loadMapSettings, saveMapSettings } from '../../lib/map-settings';
import type { MapSettings } from '../../lib/map-settings';

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        cursor: 'pointer',
        backgroundColor: checked ? '#16A34A' : '#E5E7EB',
        position: 'relative',
        flexShrink: 0,
        transition: 'background-color 0.2s',
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

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function SettingRow({ icon, label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div style={styles.row}>
      <div style={styles.rowInfo}>
        <span style={styles.rowIcon}>{icon}</span>
        <div>
          <div style={styles.rowLabel}>{label}</div>
          <div style={styles.rowDesc}>{description}</div>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function QuickSettings() {
  const [settings, setSettings] = useState<MapSettings>(loadMapSettings);

  function toggle(key: keyof MapSettings) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    saveMapSettings(next);
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <SlidersHorizontal size={18} color="#1A1A2E" strokeWidth={2} />
        <h2 style={styles.cardTitle}>Map Settings</h2>
      </div>

      <SettingRow
        icon={<Bus size={16} color="#6B7280" strokeWidth={2} />}
        label="Show moving vehicles"
        description="Overlay real-time vehicle positions on the map"
        checked={settings.showVehicles}
        onChange={() => toggle('showVehicles')}
      />

      <div style={styles.divider} />

      <SettingRow
        icon={<Clock size={16} color="#6B7280" strokeWidth={2} />}
        label="Show stop times"
        description="Display arrival times at each stop"
        checked={settings.showStopTimes}
        onChange={() => toggle('showStopTimes')}
      />
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
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '12px 0',
  },
  rowInfo: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: 500,
    color: '#111827',
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 1.4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
};
