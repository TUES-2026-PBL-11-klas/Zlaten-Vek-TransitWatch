import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
  type StrategyOptionsWithoutRequest,
} from 'passport-jwt';

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
  constructor() {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET environment variable is not set');
    }

    const opts: StrategyOptionsWithoutRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    };

    super(opts);
  }

  validate(payload: SupabaseJwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token: missing user ID');
    }

    return { userId: payload.sub, email: payload.email };
  }
}
