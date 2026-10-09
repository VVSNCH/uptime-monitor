import { Inject, Injectable } from '@nestjs/common'
import type { Check } from '@uptime/database'
import { PrismaService } from '@uptime/database/nest'

export interface CheckTotals {
  upCount: number
  downCount: number
  avgResponseMs: number | null
}

export interface DayTotals extends CheckTotals {
  day: string
}

// Reads over checks and daily_stats. Callers check that the monitor belongs to
// the user first; nothing here is reachable without a monitor id they own.
// Only finished checks count: a claim whose probe is still running has no outcome.
@Injectable()
export class HistoryRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async totalsSince(monitorIds: number[], since: Date): Promise<Map<number, CheckTotals>> {
    const totals = new Map<number, CheckTotals>()
    if (monitorIds.length === 0) return totals

    const groups = await this.prisma.check.groupBy({
      by: ['monitorId', 'ok'],
      where: { monitorId: { in: monitorIds }, checkedAt: { gte: since }, ok: { not: null } },
      _count: { _all: true },
      _avg: { responseMs: true },
    })
    for (const group of groups) {
      const entry = totals.get(group.monitorId) ?? { upCount: 0, downCount: 0, avgResponseMs: null }
      if (group.ok) {
        entry.upCount = group._count._all
        entry.avgResponseMs = roundOrNull(group._avg.responseMs)
      } else {
        entry.downCount = group._count._all
      }
      totals.set(group.monitorId, entry)
    }
    return totals
  }

  // Rolled-up days in [from, to), as YYYY-MM-DD.
  async rolledUpDays(monitorId: number, from: Date, to: Date): Promise<DayTotals[]> {
    const rows = await this.prisma.dailyStat.findMany({
      where: { monitorId, day: { gte: from, lt: to } },
      orderBy: { day: 'asc' },
    })
    return rows.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      upCount: row.upCount,
      downCount: row.downCount,
      avgResponseMs: row.avgResponseMs,
    }))
  }

  // The same figures the nightly rollup stores, worked out from raw checks for
  // days it has not reached yet.
  rawDays(monitorId: number, from: Date): Promise<DayTotals[]> {
    return this.prisma.$queryRaw<DayTotals[]>`
      SELECT to_char(checked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
             (count(*) FILTER (WHERE ok))::int AS "upCount",
             (count(*) FILTER (WHERE NOT ok))::int AS "downCount",
             round(avg(response_ms) FILTER (WHERE ok))::int AS "avgResponseMs"
      FROM checks
      WHERE monitor_id = ${monitorId} AND checked_at >= ${from} AND ok IS NOT NULL
      GROUP BY 1
      ORDER BY 1`
  }

  listChecks(monitorId: number, from: Date, to: Date): Promise<Check[]> {
    return this.prisma.check.findMany({
      where: { monitorId, checkedAt: { gte: from, lt: to }, ok: { not: null } },
      orderBy: { checkedAt: 'asc' },
    })
  }
}

function roundOrNull(value: number | null): number | null {
  return value === null ? null : Math.round(value)
}
