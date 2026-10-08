import { InjectQueue } from '@nestjs/bullmq'
import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common'
import { AppException } from '@uptime/nest-common'
import { type CheckJob, ERROR_CODES, JOB_NAMES, QUEUE_NAMES } from '@uptime/shared'
import type { Queue } from 'bullmq'

import {
  FINISHED_CHECK_JOBS_KEPT,
  MONITOR_SCHEDULER_PREFIX,
  SCHEDULE_RECONCILE_INTERVAL_MS,
} from '../constants/index.js'
import { MonitorsRepository } from './monitors.repository.js'

const MS_PER_SECOND = 1_000
const QUEUE_ERROR_LOG_INTERVAL_MS = 60_000
const QUEUE_OPERATION_TIMEOUT_MS = 2_000

export interface SchedulableMonitor {
  id: number
  intervalSeconds: number
  paused: boolean
}

export interface ReconcileResult {
  added: number
  removed: number
}

// Postgres is the source of truth for what should be checked; Redis only holds
// a copy of the schedule. Reconciling on startup and periodically means the
// schedule survives a Redis flush and repairs itself after any missed update.
@Injectable()
export class MonitorScheduleService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(MonitorScheduleService.name)
  private reconcileTimer?: NodeJS.Timeout
  private lastQueueErrorAt = 0

  constructor(
    @InjectQueue(QUEUE_NAMES.checks) private readonly checks: Queue<CheckJob>,
    @Inject(MonitorsRepository) private readonly monitors: MonitorsRepository,
  ) {
    // Without a listener BullMQ prints every failed reconnect with a stack
    // trace, which buries everything else while Redis is down.
    this.checks.on('error', (error) => this.logQueueError(error))
  }

  onApplicationBootstrap(): void {
    void this.reconcileQuietly()
    this.reconcileTimer = setInterval(
      () => void this.reconcileQuietly(),
      SCHEDULE_RECONCILE_INTERVAL_MS,
    )
    this.reconcileTimer.unref()
  }

  onApplicationShutdown(): void {
    clearInterval(this.reconcileTimer)
  }

  // Keeps the schedule in line with one monitor. A failure is logged rather
  // than thrown: the monitor change itself succeeded, and the next reconcile
  // will bring the schedule back in line.
  async sync(monitor: SchedulableMonitor): Promise<void> {
    try {
      if (monitor.paused) await withTimeout(this.checks.removeJobScheduler(schedulerId(monitor.id)))
      else await this.upsert(monitor)
    } catch (error) {
      this.logger.warn(
        `Could not update the schedule for monitor ${monitor.id}: ${describe(error)}`,
      )
    }
  }

  async unschedule(monitorId: number): Promise<void> {
    try {
      await withTimeout(this.checks.removeJobScheduler(schedulerId(monitorId)))
    } catch (error) {
      this.logger.warn(`Could not remove the schedule for monitor ${monitorId}: ${describe(error)}`)
    }
  }

  // A check someone asked for is reported if it cannot be queued, because
  // they are waiting on it.
  async runNow(monitorId: number): Promise<void> {
    const requestedAt = new Date().toISOString()
    try {
      await withTimeout(
        this.checks.add(
          JOB_NAMES.check,
          { monitorId, requestedAt },
          { removeOnComplete: FINISHED_CHECK_JOBS_KEPT, removeOnFail: FINISHED_CHECK_JOBS_KEPT },
        ),
      )
    } catch (error) {
      this.logger.warn(`Could not queue a check for monitor ${monitorId}: ${describe(error)}`)
      throw new AppException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ERROR_CODES.serviceUnavailable,
        'Checks cannot be queued right now, try again shortly',
      )
    }
  }

  async reconcile(): Promise<ReconcileResult> {
    const active = await this.monitors.listAllActive()
    const existing = new Map(
      (await withTimeout(this.checks.getJobSchedulers())).map((scheduler) => [
        scheduler.key,
        scheduler,
      ]),
    )

    const missingOrChanged = active.filter(
      (monitor) => existing.get(schedulerId(monitor.id))?.every !== intervalMs(monitor),
    )
    await Promise.all(missingOrChanged.map((monitor) => this.upsert(monitor)))

    const wanted = new Set(active.map((monitor) => schedulerId(monitor.id)))
    const orphans = [...existing.keys()].filter(
      (key) => key.startsWith(MONITOR_SCHEDULER_PREFIX) && !wanted.has(key),
    )
    await Promise.all(orphans.map((key) => withTimeout(this.checks.removeJobScheduler(key))))

    return { added: missingOrChanged.length, removed: orphans.length }
  }

  private async reconcileQuietly(): Promise<void> {
    try {
      const { added, removed } = await this.reconcile()
      if (added > 0 || removed > 0) {
        this.logger.log(`Schedule reconciled: ${added} added or updated, ${removed} removed`)
      }
    } catch (error) {
      this.logger.warn(`Schedule reconcile failed: ${describe(error)}`)
    }
  }

  private logQueueError(error: Error): void {
    const now = Date.now()
    if (now - this.lastQueueErrorAt < QUEUE_ERROR_LOG_INTERVAL_MS) return
    this.lastQueueErrorAt = now
    this.logger.warn(`Check queue unavailable: ${describe(error)}`)
  }

  private async upsert(monitor: SchedulableMonitor): Promise<void> {
    await withTimeout(
      this.checks.upsertJobScheduler(
        schedulerId(monitor.id),
        { every: intervalMs(monitor) },
        {
          name: JOB_NAMES.check,
          data: { monitorId: monitor.id },
          opts: {
            removeOnComplete: FINISHED_CHECK_JOBS_KEPT,
            removeOnFail: FINISHED_CHECK_JOBS_KEPT,
          },
        },
      ),
    )
  }
}

function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error('Timed out waiting for Redis')),
      QUEUE_OPERATION_TIMEOUT_MS,
    )
  })
  return Promise.race([operation, timeout]).finally(() => clearTimeout(timer))
}

function schedulerId(monitorId: number): string {
  return `${MONITOR_SCHEDULER_PREFIX}${monitorId}`
}

function intervalMs(monitor: SchedulableMonitor): number {
  return monitor.intervalSeconds * MS_PER_SECOND
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  return (
    error.message || ('code' in error && typeof error.code === 'string' ? error.code : error.name)
  )
}
