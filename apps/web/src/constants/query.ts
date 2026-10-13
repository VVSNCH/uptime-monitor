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

// Live updates arrive by polling until the event stream exists.
export const LIVE_REFRESH_MS = 30_000
