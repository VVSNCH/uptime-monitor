import type { Request } from 'express'

export interface AuthUser {
  id: number
}

export interface AccessTokenPayload {
  sub: number
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser
}
