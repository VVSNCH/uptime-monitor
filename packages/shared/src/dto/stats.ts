import type { StatsWindow } from '../constants/stats.js'

export interface UptimeStats {
  window: StatsWindow
  uptime: number | null
  avgResponseMs: number | null
  checkCount: number
}

export interface DailyUptime {
  day: string
  upCount: number
  downCount: number
  avgResponseMs: number | null
}

export interface ResponseTimePoint {
  checkedAt: string
  responseMs: number | null
  ok: boolean
}
