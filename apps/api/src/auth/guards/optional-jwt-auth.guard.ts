import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('supabase') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.headers.authorization) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    _err: Error | null,
    user: TUser | false,
  ): TUser {
    return (user || null) as TUser;
  }
}
