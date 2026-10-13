import {
  type CheckIntervalSeconds,
  type HttpMethod,
  MONITOR_LIMITS,
  type StatsWindow,
} from '@uptime/shared'

export const INTERVAL_OPTIONS: { value: CheckIntervalSeconds; label: string }[] = [
  { value: 60, label: 'Every minute' },
  { value: 300, label: 'Every 5 minutes' },
  { value: 900, label: 'Every 15 minutes' },
  { value: 1800, label: 'Every 30 minutes' },
  { value: 3600, label: 'Every hour' },
]

export const METHOD_OPTIONS: HttpMethod[] = ['GET', 'HEAD', 'POST']

export const MONITOR_DEFAULTS = {
  method: 'GET' as HttpMethod,
  intervalSeconds: 300 as CheckIntervalSeconds,
  timeoutMs: MONITOR_LIMITS.timeoutMs.default,
  failureThreshold: MONITOR_LIMITS.failureThreshold.default,
}

export const UPTIME_WINDOWS: { value: StatsWindow; label: string }[] = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
]

export const RESPONSE_CHART_WINDOWS: { hours: number; label: string }[] = [
  { hours: 1, label: '1h' },
  { hours: 24, label: '24h' },
  { hours: 24 * 7, label: '7d' },
]
export const DEFAULT_RESPONSE_CHART_HOURS = 24

export const SPARKLINE_HOURS = 24
