import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '@uptime/database/nest'

import { addDays, toIsoDay } from './day.js'

@Injectable()
export class RollupRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // Recomputes the whole day and overwrites it, so running the same day twice
  // gives the same row instead of doubling it. A claimed check that never
  // finished has no outcome and is left out. Returns the monitors written.
  rollUp(day: Date): Promise<number> {
    return this.prisma.$executeRaw`
      INSERT INTO daily_stats (monitor_id, day, up_count, down_count, avg_response_ms)
      SELECT monitor_id,
             ${toIsoDay(day)}::date,
             count(*) FILTER (WHERE ok),
             count(*) FILTER (WHERE NOT ok),
             round(avg(response_ms) FILTER (WHERE ok))::int
      FROM checks
      WHERE checked_at >= ${day} AND checked_at < ${addDays(day, 1)} AND ok IS NOT NULL
      GROUP BY monitor_id
      ON CONFLICT (monitor_id, day) DO UPDATE
        SET up_count = EXCLUDED.up_count,
            down_count = EXCLUDED.down_count,
            avg_response_ms = EXCLUDED.avg_response_ms`
  }

  // Deleted in batches so a large backlog never holds one long lock on the
  // table the checker is writing to.
  async pruneChecksBefore(cutoff: Date, batchSize: number): Promise<number> {
    let total = 0
    for (;;) {
      const deleted = await this.prisma.$executeRaw`
        DELETE FROM checks
        WHERE id IN (SELECT id FROM checks WHERE checked_at < ${cutoff} LIMIT ${batchSize})`
      total += deleted
      if (deleted < batchSize) return total
    }
  }
}
