import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Inject, Logger, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { type CheckJob, QUEUE_NAMES, type Transition } from '@uptime/shared'
import type { Job } from 'bullmq'

import type { Env } from '../config/env.js'
import { NotificationProducer } from '../notify/notification.producer.js'
import { type CheckOutcome, CheckRunner } from './check-runner.service.js'

// The occurrence a job belongs to is the moment it was due: when it was created
// plus how long it was told to wait. A scheduler creates each next job the
// instant the previous one starts, so creation time alone can collide with the
// job before it; the due time cannot, and it survives a second delivery. The
// wait is read from the job's options because BullMQ resets job.delay to 0 once
// the job becomes due.
export function occurrenceOf(job: Pick<Job, 'timestamp' | 'opts'>): Date {
  return new Date(job.timestamp + (job.opts.delay ?? 0))
}

@Processor(QUEUE_NAMES.checks)
export class CheckProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(CheckProcessor.name)

  constructor(
    @Inject(CheckRunner) private readonly runner: CheckRunner,
    @Inject(ConfigService) private readonly config: ConfigService<Env, true>,
    @Inject(NotificationProducer) private readonly notifications: NotificationProducer,
  ) {
    super()
  }

  onModuleInit(): void {
    this.worker.concurrency = this.config.get('CHECK_CONCURRENCY', { infer: true })
  }

  async process(job: Job<CheckJob>): Promise<CheckOutcome> {
    const outcome = await this.runner.run(job.data.monitorId, occurrenceOf(job))
    if (outcome.status === 'duplicate') {
      this.logger.warn(`Skipped a repeat delivery of job ${job.id ?? 'unknown'}`)
    }
    if (outcome.status === 'recorded' && outcome.transition) {
      const reason = outcome.result.error ? `: ${outcome.result.error}` : ''
      this.logger.log(`Monitor ${job.data.monitorId} is now ${outcome.monitorStatus}${reason}`)
      if (outcome.incidentId !== null) await this.alert(outcome.incidentId, outcome.transition)
    }
    return outcome
  }

  // The status change is already saved, so a failure here is logged rather
  // than thrown: retrying the check job would be refused as a repeat anyway.
  private async alert(incidentId: number, transition: Transition): Promise<void> {
    try {
      await this.notifications.enqueue(incidentId, transition)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.error(`Could not queue the alert for incident ${incidentId}: ${reason}`)
    }
  }
}
