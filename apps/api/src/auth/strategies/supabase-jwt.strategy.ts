import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

interface SupabaseJwtPayload {
  sub: string;
  email: string;
  aud: string;
  exp: number;
}

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
  Strategy,
  'supabase',
) {
  private readonly logger = new Logger(SupabaseJwtStrategy.name);

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;

    if (supabaseUrl) {
      // Supabase signs user JWTs with ES256 (JWKS-based verification)
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKeyProvider: passportJwtSecret({
          jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
          cache: true,
          cacheMaxAge: 600_000,
        }),
        algorithms: ['ES256'],
      } as any);
      this.logger.log(`JWT strategy initialized with JWKS from ${supabaseUrl}`);
    } else if (jwtSecret) {
      // Fallback to HS256 with shared secret
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: jwtSecret,
        algorithms: ['HS256'],
      } as any);
      this.logger.log(`JWT strategy initialized with shared secret`);
    } else {
      throw new Error(
        'Set SUPABASE_URL or SUPABASE_JWT_SECRET environment variable',
      );
    }
  }

  validate(payload: SupabaseJwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing user ID');
    }

    return { userId: payload.sub, email: payload.email };
  }
}
