import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

import type { AuthenticatedRequest, AuthUser } from '../auth.types.js'

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
)
