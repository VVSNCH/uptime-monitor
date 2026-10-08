export const HEALTH_CHECK_TIMEOUT_MS = 2_000
export const DEFAULT_API_VERSION = '1'

export const REFRESH_COOKIE_NAME = 'refresh_token'
export const REFRESH_TOKEN_BYTES = 32
export const MS_PER_DAY = 86_400_000

export const AUTH_THROTTLE = { name: 'auth', ttl: 60_000, limit: 10 } as const
