import type { AuthResponse, UserResponse } from '@uptime/shared'

export class UserDto implements UserResponse {
  id!: number
  email!: string
  isDemo!: boolean
  /** ISO 8601 */
  createdAt!: string
}

export class AuthResponseDto implements AuthResponse {
  /** Send as `Authorization: Bearer <token>`. The refresh token is set as an httpOnly cookie. */
  accessToken!: string
  /** Seconds until the access token expires. */
  expiresIn!: number
  user!: UserDto
}
