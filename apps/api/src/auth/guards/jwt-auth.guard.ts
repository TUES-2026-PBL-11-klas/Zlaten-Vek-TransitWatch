import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('supabase') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const route = `${req.method} ${req.url}`;
    const hasAuth = !!req.headers.authorization;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    this.logger.debug(
      `Guard check: ${route} | hasAuth=${hasAuth} | public=${isPublic}`,
    );
    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string } | string | undefined,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const req = context.switchToHttp().getRequest<Request>();
      const infoMsg =
        typeof info === 'object'
          ? (info?.message ?? 'none')
          : String(info ?? 'none');
      this.logger.warn(
        `Auth FAILED for ${req.method} ${req.url} — err=${err?.message ?? 'none'}, info=${infoMsg}, user=${!!user}`,
      );
    }
    return super.handleRequest(err, user, info, context);
  }
}
