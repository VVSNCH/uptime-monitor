import type {
  CheckIntervalSeconds,
  HttpMethod,
  MonitorDetail,
  MonitorStatus,
  MonitorSummary,
} from '@uptime/shared'

export class MonitorSummaryDto implements MonitorSummary {
  id!: number
  name!: string
  url!: string
  /** PENDING, UP, DOWN or PAUSED. */
  status!: MonitorStatus
  /** True when the monitor has not been checked within three of its intervals. */
  isStale!: boolean
  /** ISO 8601, or null before the first check. */
  lastCheckedAt!: string | null
  lastResponseMs!: number | null
  /** Fraction between 0 and 1, or null until there is history. */
  uptime24h!: number | null
}

export class MonitorDetailDto extends MonitorSummaryDto implements MonitorDetail {
  method!: HttpMethod
  intervalSeconds!: CheckIntervalSeconds
  timeoutMs!: number
  expectedStatus!: number | null
  failureThreshold!: number
  /** ISO 8601 */
  createdAt!: string
}
