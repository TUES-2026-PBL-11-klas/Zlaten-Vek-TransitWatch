export interface CredibilityTier {
  label: string;
  color: string;
  background: string;
}

export function getCredibilityTier(score: number): CredibilityTier {
  if (score >= 30) {
    return { label: 'Доверен', color: '#B45309', background: '#FEF3C7' };
  }
  if (score >= 15) {
    return { label: 'Надежден', color: '#15803D', background: '#DCFCE7' };
  }
  if (score >= 5) {
    return { label: 'Активен', color: '#1D4ED8', background: '#DBEAFE' };
  }
  return { label: 'Нов потребител', color: '#6B7280', background: '#F3F4F6' };
}

export const UNVERIFIED_THRESHOLD = 3;
