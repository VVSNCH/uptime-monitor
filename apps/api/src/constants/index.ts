export const HEALTH_CHECK_TIMEOUT_MS = 2_000
export const DEFAULT_API_VERSION = '1'

export const REFRESH_COOKIE_NAME = 'refresh_token'
export const REFRESH_TOKEN_BYTES = 32
export const MS_PER_DAY = 86_400_000

export const AUTH_THROTTLE = { name: 'auth', ttl: 60_000, limit: 10 } as const

export const MONITOR_SCHEDULER_PREFIX = 'monitor-'
export const SCHEDULE_RECONCILE_INTERVAL_MS = 5 * 60_000
export const FINISHED_CHECK_JOBS_KEPT = 1_000

export const INCIDENT_PAGE_SIZE = { default: 50, max: 100 } as const

export const CHANNEL_TEST_TIMEOUT_MS = 15_000
export const WEBHOOK_SECRET_PREFIX = 'whsec_'
export const WEBHOOK_SECRET_BYTES = 24
