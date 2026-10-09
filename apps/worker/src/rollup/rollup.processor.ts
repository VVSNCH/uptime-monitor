import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JOB_NAMES, QUEUE_NAMES, type RollupJob } from '@uptime/shared'
import { type Job, UnrecoverableError } from 'bullmq'

import type { Env } from '../config/env.js'
import { PRUNE_BATCH_SIZE, ROLLUP_LOOKBACK_DAYS } from '../constants/index.js'
import { daysToRollUp, parseIsoDay, retentionCutoff, toIsoDay } from './day.js'
import { RollupRepository } from './rollup.repository.js'

export type RollupOutcome = { days: string[]; monitorDays: number } | { pruned: number }

@Processor(QUEUE_NAMES.rollup)
export class RollupProcessor extends WorkerHost {
  private readonly logger = new Logger(RollupProcessor.name)
  private readonly retentionDays: number

  constructor(
    @Inject(RollupRepository) private readonly rollups: RollupRepository,
    @Inject(ConfigService) config: ConfigService<Env, true>,
  ) {
    super()
    this.retentionDays = config.get('RAW_CHECK_RETENTION_DAYS', { infer: true })
  }

  async process(job: Job<RollupJob>): Promise<RollupOutcome> {
    switch (job.name) {
      case JOB_NAMES.rollup:
        return this.rollUp(job.data, new Date())
      case JOB_NAMES.pruneChecks:
        return this.prune(new Date())
      default:
        throw new UnrecoverableError(`Unknown rollup job "${job.name}"`)
    }
  }

  async rollUp(data: RollupJob, now: Date): Promise<RollupOutcome> {
    const days = data.day ? [requireDay(data.day)] : daysToRollUp(now, ROLLUP_LOOKBACK_DAYS)
    let monitorDays = 0
    for (const day of days) monitorDays += await this.rollups.rollUp(day)

    const dayList = days.map(toIsoDay)
    this.logger.log(`Rolled up ${dayList.join(', ')}: ${monitorDays} monitor-days written`)
    return { days: dayList, monitorDays }
  }

  async prune(now: Date): Promise<RollupOutcome> {
    const cutoff = retentionCutoff(now, this.retentionDays)
    const pruned = await this.rollups.pruneChecksBefore(cutoff, PRUNE_BATCH_SIZE)
    if (pruned > 0) this.logger.log(`Deleted ${pruned} checks from before ${toIsoDay(cutoff)}`)
    return { pruned }
  }
}

function requireDay(value: string): Date {
  const day = parseIsoDay(value)
  if (!day) throw new UnrecoverableError(`"${value}" is not a day in YYYY-MM-DD form`)
  return day
}
