import { describe, it, expect } from 'vitest';
import { getCredibilityTier } from './credibility';

describe('getCredibilityTier', () => {
  describe('Доверен tier (score >= 30)', () => {
    it('returns Доверен at exactly 30', () => {
      expect(getCredibilityTier(30).label).toBe('Доверен');
    });

    it('returns Доверен above 30', () => {
      expect(getCredibilityTier(50).label).toBe('Доверен');
      expect(getCredibilityTier(100).label).toBe('Доверен');
    });
  });

  describe('Надежден tier (15 <= score < 30)', () => {
    it('returns Надежден at exactly 15', () => {
      expect(getCredibilityTier(15).label).toBe('Надежден');
    });

    it('returns Надежден just below 30', () => {
      expect(getCredibilityTier(29).label).toBe('Надежден');
    });

    it('returns Надежден in the middle of range', () => {
      expect(getCredibilityTier(20).label).toBe('Надежден');
    });
  });

  describe('Активен tier (5 <= score < 15)', () => {
    it('returns Активен at exactly 5', () => {
      expect(getCredibilityTier(5).label).toBe('Активен');
    });

    it('returns Активен just below 15', () => {
      expect(getCredibilityTier(14).label).toBe('Активен');
    });

    it('returns Активен in the middle of range', () => {
      expect(getCredibilityTier(10).label).toBe('Активен');
    });
  });

  describe('Нов потребител tier (score < 5)', () => {
    it('returns Нов потребител at exactly 4', () => {
      expect(getCredibilityTier(4).label).toBe('Нов потребител');
    });

    it('returns Нов потребител at 0', () => {
      expect(getCredibilityTier(0).label).toBe('Нов потребител');
    });

    it('returns Нов потребител for negative scores', () => {
      expect(getCredibilityTier(-5).label).toBe('Нов потребител');
    });
  });

  describe('result shape', () => {
    it('each tier result has non-empty color and background', () => {
      const scores = [0, 5, 15, 30];
      for (const score of scores) {
        const tier = getCredibilityTier(score);
        expect(tier.color).toBeTruthy();
        expect(tier.background).toBeTruthy();
      }
    });

    it('different tiers have different colors', () => {
      const colors = new Set([
        getCredibilityTier(0).color,
        getCredibilityTier(5).color,
        getCredibilityTier(15).color,
        getCredibilityTier(30).color,
      ]);
      expect(colors.size).toBe(4);
    });
  });
});
