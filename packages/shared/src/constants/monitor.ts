export const MONITOR_STATUS = {
  pending: 'PENDING',
  up: 'UP',
  down: 'DOWN',
  paused: 'PAUSED',
} as const

export type MonitorStatus = (typeof MONITOR_STATUS)[keyof typeof MONITOR_STATUS]

export const CHECK_INTERVALS_SECONDS = [60, 300, 900, 1800, 3600] as const

export type CheckIntervalSeconds = (typeof CHECK_INTERVALS_SECONDS)[number]

export const HTTP_METHODS = ['GET', 'HEAD', 'POST'] as const

export type HttpMethod = (typeof HTTP_METHODS)[number]

export const MONITOR_LIMITS = {
  nameMaxLength: 100,
  urlMaxLength: 2048,
  timeoutMs: { min: 1_000, max: 30_000, default: 10_000 },
  failureThreshold: { min: 1, max: 10, default: 2 },
  expectedStatus: { min: 100, max: 599 },
} as const

// A monitor not checked within this many of its own intervals is stale: its
// last status is no longer evidence of anything.
export const STALE_INTERVAL_MULTIPLIER = 3

export const ALLOWED_URL_PROTOCOLS = ['http:', 'https:'] as const
