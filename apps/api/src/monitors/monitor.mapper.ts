import type { Monitor } from '@uptime/database'
import {
  CHECK_INTERVALS_SECONDS,
  type CheckIntervalSeconds,
  HTTP_METHODS,
  type HttpMethod,
  MONITOR_STATUS,
  type MonitorDetail,
  type MonitorSummary,
  STALE_INTERVAL_MULTIPLIER,
} from '@uptime/shared'

const MS_PER_SECOND = 1_000

// A paused monitor is never stale: nobody expects it to be checked. A monitor
// that has never been checked is stale once it has waited as long as one that
// stopped being checked would have.
export function isStale(monitor: Monitor, now: Date): boolean {
  if (monitor.paused) return false
  const lastActivity = monitor.lastCheckedAt ?? monitor.createdAt
  const allowedMs = monitor.intervalSeconds * MS_PER_SECOND * STALE_INTERVAL_MULTIPLIER
  return now.getTime() - lastActivity.getTime() > allowedMs
}

export function toMonitorSummary(
  monitor: Monitor,
  now: Date,
  uptime24h: number | null = null,
): MonitorSummary {
  return {
    id: monitor.id,
    name: monitor.name,
    url: monitor.url,
    status: monitor.paused ? MONITOR_STATUS.paused : monitor.status,
    isStale: isStale(monitor, now),
    lastCheckedAt: monitor.lastCheckedAt?.toISOString() ?? null,
    lastResponseMs: monitor.lastResponseMs,
    uptime24h,
  }
}

export function toMonitorDetail(
  monitor: Monitor,
  now: Date,
  uptime24h: number | null = null,
): MonitorDetail {
  return {
    ...toMonitorSummary(monitor, now, uptime24h),
    method: asHttpMethod(monitor.method),
    intervalSeconds: asCheckInterval(monitor.intervalSeconds),
    timeoutMs: monitor.timeoutMs,
    expectedStatus: monitor.expectedStatus,
    failureThreshold: monitor.failureThreshold,
    createdAt: monitor.createdAt.toISOString(),
  }
}

// Both are validated on the way in, so a value outside the set means the data
// was changed behind the api's back. Failing loudly beats returning nonsense.
function asHttpMethod(value: string): HttpMethod {
  const method = HTTP_METHODS.find((candidate) => candidate === value)
  if (!method) throw new Error(`Unexpected HTTP method in database: ${value}`)
  return method
}

function asCheckInterval(value: number): CheckIntervalSeconds {
  const interval = CHECK_INTERVALS_SECONDS.find((candidate) => candidate === value)
  if (!interval) throw new Error(`Unexpected check interval in database: ${value}`)
  return interval
}
