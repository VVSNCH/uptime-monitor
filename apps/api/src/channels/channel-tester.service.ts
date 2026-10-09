import { InjectQueue } from '@nestjs/bullmq'
import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppException } from '@uptime/nest-common'
import {
  type ChannelTestResult,
  ERROR_CODES,
  JOB_NAMES,
  QUEUE_NAMES,
  type TestDeliveryJob,
} from '@uptime/shared'
import { type Queue, QueueEvents } from 'bullmq'

import type { Env } from '../config/env.js'
import { CHANNEL_TEST_TIMEOUT_MS } from '../constants/index.js'
import { withTimeout } from '../queue/with-timeout.js'

const FINISHED_TESTS_KEPT = 100
const EVENTS_ERROR_LOG_INTERVAL_MS = 60_000

function isTestResult(value: unknown): value is ChannelTestResult {
  return typeof value === 'object' && value !== null && 'delivered' in value
}

// Deliveries happen in the worker, which owns the outbound guard and the mail
// settings, so a test is queued like any alert and the request waits for the
// worker's answer. The queue stays the only channel between the two.
@Injectable()
export class ChannelTester implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChannelTester.name)
  private events?: QueueEvents
  private lastErrorLoggedAt = 0

  constructor(
    @InjectQueue(QUEUE_NAMES.notifications) private readonly queue: Queue<TestDeliveryJob>,
    @Inject(ConfigService) private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit(): void {
    const url = this.config.get('REDIS_URL', { infer: true })
    this.events = new QueueEvents(QUEUE_NAMES.notifications, { connection: { url } })
    this.events.on('error', (error) => {
      const now = Date.now()
      if (now - this.lastErrorLoggedAt < EVENTS_ERROR_LOG_INTERVAL_MS) return
      this.lastErrorLoggedAt = now
      this.logger.warn(`Notification events unavailable: ${error.message}`)
    })
  }

  async onModuleDestroy(): Promise<void> {
    await this.events?.close()
  }

  async test(channelId: number): Promise<ChannelTestResult> {
    const events = this.events
    if (!events) throw unavailable('Channel tests are not available yet, try again shortly')

    let job
    try {
      job = await withTimeout(
        this.queue.add(
          JOB_NAMES.testDelivery,
          { channelId },
          { attempts: 1, removeOnComplete: FINISHED_TESTS_KEPT, removeOnFail: FINISHED_TESTS_KEPT },
        ),
      )
    } catch {
      throw unavailable('The test could not be queued right now, try again shortly')
    }

    try {
      const result: unknown = await job.waitUntilFinished(events, CHANNEL_TEST_TIMEOUT_MS)
      if (isTestResult(result)) return result
    } catch {
      throw unavailable(
        'The worker did not answer in time. Check that it is running and try again.',
      )
    }
    throw unavailable('The worker sent back an answer that could not be read')
  }
}

function unavailable(message: string): AppException {
  return new AppException(HttpStatus.SERVICE_UNAVAILABLE, ERROR_CODES.serviceUnavailable, message)
}
