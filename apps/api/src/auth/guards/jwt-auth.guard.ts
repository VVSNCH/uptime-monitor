import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AppException } from '@uptime/nest-common'
import { ERROR_CODES } from '@uptime/shared'

import type { AuthenticatedRequest } from '../auth.types.js'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js'
import { TokenService } from '../token.service.js'

const BEARER_PREFIX = 'Bearer '

// Installed globally: every route needs a valid access token unless it opts
// out with @Public(), so forgetting a guard fails closed.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TokenService) private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const header = request.headers.authorization
    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.unauthorized,
        'Sign in to continue',
      )
    }

    request.user = await this.tokens.verifyAccessToken(header.slice(BEARER_PREFIX.length))
    return true
  }
}
