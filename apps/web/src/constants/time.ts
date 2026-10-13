export const TIME_ZONE_MODES = ['local', 'utc'] as const

export type TimeZoneMode = (typeof TIME_ZONE_MODES)[number]

export const TIME_ZONE_STORAGE_KEY = 'uptime.timeZone'

// How often relative times such as "2 minutes ago" are redrawn.
export const RELATIVE_TIME_TICK_MS = 15_000

export const MS_PER_SECOND = 1_000
export const MS_PER_MINUTE = 60_000
export const MS_PER_HOUR = 3_600_000
export const MS_PER_DAY = 86_400_000
