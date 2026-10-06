import type { CheckIntervalSeconds, HttpMethod, MonitorStatus } from '../constants/monitor.js'

export interface MonitorSummary {
  id: number
  name: string
  url: string
  status: MonitorStatus
  isStale: boolean
  lastCheckedAt: string | null
  lastResponseMs: number | null
  uptime24h: number | null
}

export interface MonitorDetail extends MonitorSummary {
  method: HttpMethod
  intervalSeconds: CheckIntervalSeconds
  timeoutMs: number
  expectedStatus: number | null
  failureThreshold: number
  createdAt: string
}

export interface CreateMonitorRequest {
  name: string
  url: string
  method?: HttpMethod
  intervalSeconds: CheckIntervalSeconds
  timeoutMs?: number
  expectedStatus?: number | null
  failureThreshold?: number
}

export type UpdateMonitorRequest = Partial<CreateMonitorRequest>
