import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import type { Check } from '@uptime/database'
import { AppException } from '@uptime/nest-common'
import {
  CHECK_HISTORY_MAX_DAYS,
  type CheckHistoryQuery,
  type CheckResult,
  ERROR_CODES,
  type StatsWindow,
  type UptimeStats,
} from '@uptime/shared'

import { MS_PER_DAY } from '../constants/index.js'
import { HistoryRepository } from '../history/history.repository.js'
import { MonitorsRepository } from '../monitors/monitors.repository.js'
import { fillDays, rawFrom, statsRange, summarize } from './stats.calculator.js'

const DEFAULT_WINDOW: StatsWindow = '24h'

@Injectable()
export class StatsService {
  constructor(
    @Inject(MonitorsRepository) private readonly monitors: MonitorsRepository,
    @Inject(HistoryRepository) private readonly history: HistoryRepository,
  ) {}

  async stats(userId: number, monitorId: number, window = DEFAULT_WINDOW): Promise<UptimeStats> {
    await this.requireMonitor(userId, monitorId)
    const range = statsRange(window, new Date())
    const base = { window, from: range.from.toISOString(), to: range.to.toISOString() }

    if (!range.firstDay || !range.today) {
      const totals = await this.history.totalsSince([monitorId], range.from)
      return { ...base, ...summarize([...totals.values()]), days: [] }
    }

    // Today always comes from raw checks: it is still being written, so any
    // rollup of it is already out of date.
    const rolledUp = await this.history.rolledUpDays(monitorId, range.firstDay, range.today)
    const raw = await this.history.rawDays(monitorId, rawFrom(range.firstDay, rolledUp))
    const days = fillDays(range.firstDay, range.dayCount, rolledUp, raw)
    return { ...base, ...summarize(days), days }
  }

  async checks(
    userId: number,
    monitorId: number,
    query: CheckHistoryQuery,
  ): Promise<CheckResult[]> {
    await this.requireMonitor(userId, monitorId)
    const to = query.to ? new Date(query.to) : new Date()
    const from = query.from ? new Date(query.from) : new Date(to.getTime() - MS_PER_DAY)
    if (from >= to) throw invalid('from must be earlier than to')
    if (to.getTime() - from.getTime() > CHECK_HISTORY_MAX_DAYS * MS_PER_DAY) {
      throw invalid(`from and to can be at most ${CHECK_HISTORY_MAX_DAYS} days apart`)
    }
    return (await this.history.listChecks(monitorId, from, to)).map(toCheckResult)
  }

  // Another user's monitor answers 404, like every other monitor route.
  private async requireMonitor(userId: number, monitorId: number): Promise<void> {
    if (!(await this.monitors.findForUser(userId, monitorId))) {
      throw new AppException(HttpStatus.NOT_FOUND, ERROR_CODES.notFound, 'Monitor not found')
    }
  }
}

function toCheckResult(check: Check): CheckResult {
  return {
    id: check.id.toString(),
    scheduledFor: check.scheduledFor.toISOString(),
    checkedAt: check.checkedAt.toISOString(),
    ok: check.ok ?? false,
    statusCode: check.statusCode,
    responseMs: check.responseMs,
    error: check.error,
  }
}

function invalid(message: string): AppException {
  return new AppException(HttpStatus.BAD_REQUEST, ERROR_CODES.validationFailed, message)
}
