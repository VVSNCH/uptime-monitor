export const STATS_WINDOWS = ['24h', '7d', '30d', '90d'] as const

export type StatsWindow = (typeof STATS_WINDOWS)[number]

export const UPTIME_HISTORY_DAYS = 90

// Raw checks are listed for a chart, so one request covers at most a week.
export const CHECK_HISTORY_MAX_DAYS = 7
