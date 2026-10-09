import {
  type CheckHistoryQuery,
  type CheckResult,
  type DailyUptime,
  STATS_WINDOWS,
  type StatsWindow,
  type UptimeStats,
} from '@uptime/shared'
import { IsIn, IsISO8601, IsOptional } from 'class-validator'

export class StatsQueryDto {
  /** Defaults to 24h. */
  @IsOptional()
  @IsIn(STATS_WINDOWS, { message: `window must be one of ${STATS_WINDOWS.join(', ')}` })
  window?: StatsWindow
}

export class CheckHistoryQueryDto implements CheckHistoryQuery {
  /** ISO 8601. Defaults to 24 hours before `to`. */
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'from must be an ISO 8601 date and time' })
  from?: string

  /** ISO 8601. Defaults to now. At most 7 days after `from`. */
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'to must be an ISO 8601 date and time' })
  to?: string
}

export class DailyUptimeDto implements DailyUptime {
  /** UTC calendar day, YYYY-MM-DD. */
  day!: string
  upCount!: number
  downCount!: number
  /** Average of the successful checks that day. */
  avgResponseMs!: number | null
}

export class UptimeStatsDto implements UptimeStats {
  window!: StatsWindow
  /** ISO 8601. For 7d, 30d and 90d this is the start of the first UTC day. */
  from!: string
  /** ISO 8601 */
  to!: string
  /** Fraction between 0 and 1, or null when there were no checks. */
  uptime!: number | null
  avgResponseMs!: number | null
  checkCount!: number
  /** One entry per UTC day, oldest first, today last. Empty for 24h. */
  days!: DailyUptimeDto[]
}

export class CheckResultDto implements CheckResult {
  id!: string
  /** ISO 8601. The occurrence this check ran for. */
  scheduledFor!: string
  /** ISO 8601 */
  checkedAt!: string
  ok!: boolean
  statusCode!: number | null
  responseMs!: number | null
  error!: string | null
}
