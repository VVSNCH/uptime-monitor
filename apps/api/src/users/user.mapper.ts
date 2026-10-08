import type { User } from '@uptime/database'
import type { UserResponse } from '@uptime/shared'

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    isDemo: user.isDemo,
    createdAt: user.createdAt.toISOString(),
  }
}
