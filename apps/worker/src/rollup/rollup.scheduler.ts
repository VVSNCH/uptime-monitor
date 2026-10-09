import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { JOB_NAMES, QUEUE_NAMES, type RollupJob } from '@uptime/shared'
import type { Queue } from 'bullmq'

import {
  FINISHED_ROLLUP_JOBS_KEPT,
  PRUNE_CRON,
  PRUNE_SCHEDULER_ID,
  ROLLUP_CRON,
  ROLLUP_SCHEDULER_ID,
} from '../constants/index.js'

const JOB_OPTIONS = {
  removeOnComplete: FINISHED_ROLLUP_JOBS_KEPT,
  removeOnFail: FINISHED_ROLLUP_JOBS_KEPT,
}

// Upserting is idempotent, so every worker does it on startup and the schedule
// comes back by itself after a Redis flush. Not awaited: checks should start
// running even while Redis is still connecting.
@Injectable()
export class RollupScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(RollupScheduler.name)

  constructor(@InjectQueue(QUEUE_NAMES.rollup) private readonly queue: Queue<RollupJob>) {}

  onApplicationBootstrap(): void {
    this.schedule().catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Could not schedule the nightly rollup: ${reason}`)
    })
  }

  async schedule(): Promise<void> {
    await this.queue.upsertJobScheduler(
      ROLLUP_SCHEDULER_ID,
      { pattern: ROLLUP_CRON, tz: 'UTC' },
      { name: JOB_NAMES.rollup, data: {}, opts: JOB_OPTIONS },
    )
    await this.queue.upsertJobScheduler(
      PRUNE_SCHEDULER_ID,
      { pattern: PRUNE_CRON, tz: 'UTC' },
      { name: JOB_NAMES.pruneChecks, data: {}, opts: JOB_OPTIONS },
    )
  }
}
