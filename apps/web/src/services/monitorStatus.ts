import { MONITOR_STATUS, type MonitorSummary } from '@uptime/shared'

import { DISPLAY_STATUS, type DisplayStatus } from '../constants/status'

// A stale monitor shows as unknown: its last status is no longer evidence of
// anything, and a stale UP is a confident claim that may be false.
export function toDisplayStatus(
  monitor: Pick<MonitorSummary, 'status' | 'isStale'>,
): DisplayStatus {
  if (monitor.status === MONITOR_STATUS.paused) return DISPLAY_STATUS.paused
  if (monitor.isStale) return DISPLAY_STATUS.unknown
  switch (monitor.status) {
    case MONITOR_STATUS.up:
      return DISPLAY_STATUS.up
    case MONITOR_STATUS.down:
      return DISPLAY_STATUS.down
    case MONITOR_STATUS.pending:
      return DISPLAY_STATUS.pending
  }
}

export interface MonitorOverview {
  upCount: number
  downCount: number
  pausedCount: number
  // Checks have stopped altogether: every monitor that should be checked is stale.
  isStalled: boolean
  lastCheckedAt: string | null
}

export function summarizeMonitors(monitors: MonitorSummary[]): MonitorOverview {
  const active = monitors.filter((monitor) => monitor.status !== MONITOR_STATUS.paused)
  const lastCheckedAt =
    active
      .map((monitor) => monitor.lastCheckedAt)
      .filter((value) => value !== null)
      .sort()
      .at(-1) ?? null

  return {
    upCount: monitors.filter((monitor) => toDisplayStatus(monitor) === DISPLAY_STATUS.up).length,
    downCount: monitors.filter((monitor) => toDisplayStatus(monitor) === DISPLAY_STATUS.down)
      .length,
    pausedCount: monitors.length - active.length,
    isStalled: active.length > 0 && active.every((monitor) => monitor.isStale),
    lastCheckedAt,
  }
}
