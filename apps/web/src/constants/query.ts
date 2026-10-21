import type { StatsWindow } from '@uptime/shared'

export const QUERY_KEYS = {
  monitors: ['monitors'],
  monitor: (id: number) => ['monitors', id],
  monitorStats: (id: number, window: StatsWindow) => ['monitors', id, 'stats', window],
  monitorChecks: (id: number, hours: number) => ['monitors', id, 'checks', hours],
  incidents: ['incidents'],
  incidentList: (isOpenOnly: boolean) => ['incidents', { isOpenOnly }],
  monitorIncidents: (id: number) => ['incidents', { monitorId: id }],
  channels: ['channels'],
} as const

export const QUERY_STALE_TIME_MS = 30_000
export const QUERY_MAX_RETRIES = 2

// Changes arrive over the event stream; this slower poll is the safety net.
// It still matters when the stream is healthy: if the worker dies, no events
// arrive at all, and only a refetch reveals that the monitors have gone stale.
export const LIVE_REFRESH_MS = 60_000
