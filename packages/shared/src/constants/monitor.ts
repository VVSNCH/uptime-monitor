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
} as const

export const ALLOWED_URL_PROTOCOLS = ['http:', 'https:'] as const
