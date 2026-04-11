import { UnauthorizedException } from '@nestjs/common';

// Mock jwks-rsa before importing the strategy (ESM module Jest can't parse)
jest.mock('jwks-rsa', () => ({
  passportJwtSecret: jest.fn(() => () => 'mock-secret'),
}));

import { SupabaseJwtStrategy } from './supabase-jwt.strategy';

describe('SupabaseJwtStrategy', () => {
  const SECRET = 'test-secret-that-is-at-least-32-characters';
  let originalSecret: string | undefined;
  let originalUrl: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.SUPABASE_JWT_SECRET;
    originalUrl = process.env.SUPABASE_URL;
    // Use HS256 fallback path for tests (no JWKS needed)
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_JWT_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.SUPABASE_JWT_SECRET = originalSecret;
    } else {
      delete process.env.SUPABASE_JWT_SECRET;
    }
    if (originalUrl !== undefined) {
      process.env.SUPABASE_URL = originalUrl;
    } else {
      delete process.env.SUPABASE_URL;
    }
  });

  describe('constructor', () => {
    it('throws when neither SUPABASE_URL nor SUPABASE_JWT_SECRET is set', () => {
      delete process.env.SUPABASE_JWT_SECRET;
      delete process.env.SUPABASE_URL;

      expect(() => new SupabaseJwtStrategy()).toThrow(
        'Set SUPABASE_URL or SUPABASE_JWT_SECRET environment variable',
      );
    });
  });

  describe('validate', () => {
    let strategy: SupabaseJwtStrategy;

    beforeEach(() => {
      strategy = new SupabaseJwtStrategy();
    });

    it('extracts userId and email from a valid payload', () => {
      const payload = {
        sub: 'user-uuid-1',
        email: 'rider@sofia.bg',
        aud: 'authenticated',
        exp: 9_999_999_999,
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-uuid-1',
        email: 'rider@sofia.bg',
      });
    });

    it('throws UnauthorizedException when sub is missing', () => {
      const payload = {
        sub: '',
        email: 'rider@sofia.bg',
        aud: 'authenticated',
        exp: 9_999_999_999,
      };

      expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
    });

    it('returns undefined email when email is not in payload', () => {
      const payload = {
        sub: 'user-uuid-1',
        email: undefined as unknown as string,
        aud: 'authenticated',
        exp: 9_999_999_999,
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-uuid-1',
        email: undefined,
      });
    });
  });
});
