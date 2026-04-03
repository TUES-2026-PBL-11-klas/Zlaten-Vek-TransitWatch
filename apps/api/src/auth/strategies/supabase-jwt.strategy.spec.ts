import { UnauthorizedException } from '@nestjs/common';
import { SupabaseJwtStrategy } from './supabase-jwt.strategy';

describe('SupabaseJwtStrategy', () => {
  const SECRET = 'test-secret-that-is-at-least-32-characters';
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.SUPABASE_JWT_SECRET;
    process.env.SUPABASE_JWT_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.SUPABASE_JWT_SECRET = originalSecret;
    } else {
      delete process.env.SUPABASE_JWT_SECRET;
    }
  });

  describe('constructor', () => {
    it('throws when SUPABASE_JWT_SECRET is not set', () => {
      delete process.env.SUPABASE_JWT_SECRET;

      expect(() => new SupabaseJwtStrategy()).toThrow(
        'SUPABASE_JWT_SECRET environment variable is not set',
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
