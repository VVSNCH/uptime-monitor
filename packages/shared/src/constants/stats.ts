export const STATS_WINDOWS = ['24h', '7d', '30d', '90d'] as const

export type StatsWindow = (typeof STATS_WINDOWS)[number]

export const UPTIME_HISTORY_DAYS = 90
