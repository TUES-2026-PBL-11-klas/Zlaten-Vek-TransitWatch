import { useState, useRef } from 'react';
import {
  Wrench,
  TrafficCone,
  Ticket,
  Siren,
  Info,
  Camera,
  X,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { useVehicles } from '../../hooks/useVehicles';
import { useLines } from '../../hooks/useLines';
import { findNearbyVehicles } from '../../lib/geo';
import { uploadReportPhoto } from '../../lib/storage';
import { transitApi } from '../../lib/transit-api';
import { triggerReportsRefetch } from '../../hooks/useActiveReports';
import { TRANSIT_COLORS } from '../../types/transit';
import type { VehiclePosition, TransitLine } from '../../types/transit';

interface ReportFlowProps {
  userLocation: { lat: number; lng: number };
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'vehicles' | 'category' | 'details';

const CATEGORY_OPTIONS = [
  { value: 'VEHICLE_ISSUE', label: 'Повреда', desc: 'Счупен климатик, врата...', icon: Wrench, color: '#DC2626' },
  { value: 'TRAFFIC', label: 'Трафик', desc: 'Закъснение, претъпкване', icon: TrafficCone, color: '#EA580C' },
  { value: 'INSPECTORS', label: 'Контрольори', desc: 'Проверка на билети', icon: Ticket, color: '#1D4ED8' },
  { value: 'SAFETY', label: 'Безопасност', desc: 'Агресивен пътник...', icon: Siren, color: '#BE123C' },
  { value: 'OTHER', label: 'Друго', desc: 'Свободни места, промяна', icon: Info, color: '#6B7280' },
] as const;

const TYPE_ICONS: Record<string, string> = {
  bus: '\u{1F68C}',
  tram: '\u{1F68B}',
  trolley: '\u{1F68E}',
  metro: '\u{24C2}\u{FE0F}',
};

export default function ReportFlow({ userLocation, onClose, onSuccess }: ReportFlowProps) {
  const [step, setStep] = useState<Step>('vehicles');
  const [selectedLine, setSelectedLine] = useState<TransitLine | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { vehicles } = useVehicles();
  const { linesByGtfsId } = useLines();

  const nearbyResult = findNearbyVehicles(userLocation.lat, userLocation.lng, vehicles);

  function handleVehicleSelect(vehicle: VehiclePosition) {
    const line = linesByGtfsId.get(vehicle.routeGtfsId);
    if (!line) return;
    setSelectedLine(line);
    setSelectedVehicleId(vehicle.vehicleId);
    setStep('category');
  }

  function handleCategorySelect(category: string) {
    setSelectedCategory(category);
    setStep('details');
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!selectedLine || !selectedCategory) return;
    setSubmitting(true);
    setError(null);

    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        photoUrl = await uploadReportPhoto(photoFile);
      }

      await transitApi.createReport({
        lineId: selectedLine.id,
        vehicleId: selectedVehicleId ?? undefined,
        category: selectedCategory,
        description: description.trim() || undefined,
        photoUrl,
      });

      triggerReportsRefetch();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Грешка при изпращане на доклада.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (step === 'details') setStep('category');
    else if (step === 'category') setStep('vehicles');
    else onClose();
  }

  const stepTitle = {
    vehicles: 'Превозни средства наблизо',
    category: 'Категория',
    details: 'Детайли',
  }[step];

  return (
    <div className="report-overlay">
      <div className="report-backdrop" onClick={onClose} />
      <div className="report-sheet">
        <div className="report-sheet-handle" />

        {/* Header */}
        <div className="report-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {step !== 'vehicles' && (
              <button
                onClick={handleBack}
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
                }}
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <h3 className="report-sheet-title">{stepTitle}</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F3F4F6',
              border: 'none',
              cursor: 'pointer',
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280',
              fontSize: 13,
              padding: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="report-sheet-body">
          {step === 'vehicles' && (
            <VehicleSelectStep
              nearbyResult={nearbyResult}
              linesByGtfsId={linesByGtfsId}
              onSelect={handleVehicleSelect}
            />
          )}
          {step === 'category' && (
            <CategorySelectStep onSelect={handleCategorySelect} />
          )}
          {step === 'details' && (
            <DetailsStep
              description={description}
              onDescriptionChange={setDescription}
              photoPreview={photoPreview}
              fileInputRef={fileInputRef}
              onPhotoChange={handlePhotoChange}
              onRemovePhoto={removePhoto}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Vehicle Selection ──────────────────────────────────────────── */

function VehicleSelectStep({
  nearbyResult,
  linesByGtfsId,
  onSelect,
}: {
  nearbyResult: ReturnType<typeof findNearbyVehicles>;
  linesByGtfsId: Map<string, TransitLine>;
  onSelect: (v: VehiclePosition) => void;
}) {
  if (!nearbyResult) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#6B7280' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📍</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Няма превозни средства наблизо</div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
          Приближете се до превозно средство, за да подадете доклад.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
        Намерени {nearbyResult.results.length} в радиус от {nearbyResult.radius}м
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {nearbyResult.results.map(({ vehicle, distance }) => {
          const line = linesByGtfsId.get(vehicle.routeGtfsId);
          if (!line) return null;
          const color = line.color ? `#${line.color}` : (TRANSIT_COLORS[line.type] ?? '#6B7280');
          const typeIcon = TYPE_ICONS[line.type] ?? '';

          return (
            <button
              key={vehicle.vehicleId}
              onClick={() => onSelect(vehicle)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'border-color 160ms ease, background 160ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
                e.currentTarget.style.background = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.background = '#F9FAFB';
              }}
            >
              <span style={{ fontSize: 20 }}>{typeIcon}</span>
              <span
                style={{
                  background: color,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '3px 8px',
                  borderRadius: 6,
                  minWidth: 32,
                  textAlign: 'center',
                }}
              >
                {line.name}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#111827',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {vehicle.headsign ?? 'Неизвестна дестинация'}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {Math.round(distance)}м
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>
                Докладвай →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 2: Category Selection ─────────────────────────────────────────── */

function CategorySelectStep({ onSelect }: { onSelect: (category: string) => void }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: 10,
    }}>
      {CATEGORY_OPTIONS.map((cat) => {
        const Icon = cat.icon;
        return (
          <button
            key={cat.value}
            onClick={() => onSelect(cat.value)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '16px 10px',
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'border-color 160ms ease, background 160ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = cat.color;
              e.currentTarget.style.background = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.background = '#F9FAFB';
            }}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${cat.color}14`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 2,
            }}>
              <Icon size={22} color={cat.color} strokeWidth={2} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{cat.label}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.3 }}>
              {cat.desc}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Step 3: Details + Submit ───────────────────────────────────────────── */

function DetailsStep({
  description,
  onDescriptionChange,
  photoPreview,
  fileInputRef,
  onPhotoChange,
  onRemovePhoto,
  onSubmit,
  submitting,
  error,
}: {
  description: string;
  onDescriptionChange: (v: string) => void;
  photoPreview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Description */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, display: 'block' }}>
          Описание (незадължително)
        </label>
        <textarea
          value={description}
          onChange={(e) => {
            if (e.target.value.length <= 140) onDescriptionChange(e.target.value);
          }}
          placeholder="Какво се случва?"
          rows={3}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: 10,
            fontSize: 14,
            fontFamily: "'Inter', system-ui, sans-serif",
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#16A34A')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
        />
        <div style={{ fontSize: 11, color: description.length > 120 ? '#F59E0B' : '#9CA3AF', textAlign: 'right', marginTop: 4 }}>
          {description.length}/140
        </div>
      </div>

      {/* Photo */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, display: 'block' }}>
          Снимка (незадължително)
        </label>
        {photoPreview ? (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={photoPreview}
              alt="Preview"
              style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 10, border: '1px solid #E5E7EB' }}
            />
            <button
              onClick={onRemovePhoto}
              style={{
                position: 'absolute',
                top: -12,
                right: -12,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: '#DC2626',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                padding: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: '#F9FAFB',
              border: '1px dashed #D1D5DB',
              borderRadius: 10,
              cursor: 'pointer',
              color: '#6B7280',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <Camera size={16} />
            Добави снимка
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onPhotoChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '8px 12px',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 8,
          fontSize: 13,
          color: '#DC2626',
        }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={submitting}
        style={{
          background: submitting ? '#86EFAC' : '#16A34A',
          color: '#FFFFFF',
          border: 'none',
          padding: '12px 0',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: submitting ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 160ms ease',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? 'Изпращане...' : 'Изпрати доклад'}
      </button>
    </div>
  );
}
