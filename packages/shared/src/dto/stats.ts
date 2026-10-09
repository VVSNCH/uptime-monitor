import type { StatsWindow } from '../constants/stats.js'

export interface UptimeStats {
  window: StatsWindow
  from: string
  to: string
  uptime: number | null
  avgResponseMs: number | null
  checkCount: number
  days: DailyUptime[]
}

export interface DailyUptime {
  day: string
  upCount: number
  downCount: number
  avgResponseMs: number | null
}
