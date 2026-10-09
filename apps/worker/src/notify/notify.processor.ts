import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { InjectQueue } from '@nestjs/bullmq'
import { Inject, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { NotificationChannel } from '@uptime/database'
import {
  CHANNEL_TYPE,
  type ChannelTestResult,
  type DeliveryJob,
  JOB_NAMES,
  type NotificationJob,
  QUEUE_NAMES,
  type TestDeliveryJob,
} from '@uptime/shared'
import { type Job, type Queue, UnrecoverableError } from 'bullmq'

import type { Env } from '../config/env.js'
import {
  DELIVERY_ATTEMPTS,
  DELIVERY_BACKOFF_MS,
  NOTIFICATION_JOB_RETENTION_SECONDS,
} from '../constants/index.js'
import { EMAIL_NOT_CONFIGURED, EmailChannel } from './email.channel.js'
import { buildIncidentMessage, buildTestMessage, type Message } from './message.js'
import { NotifyRepository } from './notify.repository.js'
import { WebhookChannel } from './webhook.channel.js'

export type NotificationQueueJob = NotificationJob | DeliveryJob | TestDeliveryJob

export type NotifyOutcome = { channels: number } | { skipped: string } | ChannelTestResult

// One queue, three kinds of job. A status change fans out into one delivery per
// channel, and each delivery retries on its own, so a mail server that is down
// never causes a working Slack channel to be sent the same alert again.
@Processor(QUEUE_NAMES.notifications)
export class NotifyProcessor extends WorkerHost {
  private readonly logger = new Logger(NotifyProcessor.name)
  private readonly dashboardUrl: string

  constructor(
    @Inject(NotifyRepository) private readonly notifications: NotifyRepository,
    @Inject(WebhookChannel) private readonly webhooks: WebhookChannel,
    @Inject(EmailChannel) private readonly email: EmailChannel,
    @InjectQueue(QUEUE_NAMES.notifications) private readonly queue: Queue<NotificationQueueJob>,
    @Inject(ConfigService) config: ConfigService<Env, true>,
  ) {
    super()
    this.dashboardUrl = config.get('APP_PUBLIC_URL', { infer: true })
  }

  async process(job: Job<NotificationQueueJob>): Promise<NotifyOutcome> {
    switch (job.name) {
      case JOB_NAMES.notify:
        return this.fanOut(job.id ?? '', job.data as NotificationJob)
      case JOB_NAMES.deliver:
        return this.deliver(job.data as DeliveryJob)
      case JOB_NAMES.testDelivery:
        return this.test(job.data as TestDeliveryJob)
      default:
        throw new UnrecoverableError(`Unknown notification job "${job.name}"`)
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationQueueJob> | undefined, error: Error): void {
    if (!job) return
    const isFinal =
      error instanceof UnrecoverableError || job.attemptsMade >= (job.opts.attempts ?? 1)
    if (!isFinal) return
    this.logger.error(`Gave up on ${job.name} job ${job.id ?? 'unknown'}: ${error.message}`)
  }

  private async fanOut(parentId: string, data: NotificationJob): Promise<NotifyOutcome> {
    const context = await this.notifications.findIncident(data.incidentId)
    if (!context) return { skipped: 'incident no longer exists' }

    const channels = await this.notifications.channelsToNotify(
      context.monitor.userId,
      data.transition,
    )
    await this.queue.addBulk(
      channels.map((channel) => ({
        name: JOB_NAMES.deliver,
        data: { ...data, channelId: channel.id },
        opts: {
          jobId: `${parentId}-channel-${channel.id}`,
          attempts: DELIVERY_ATTEMPTS,
          backoff: { type: 'exponential', delay: DELIVERY_BACKOFF_MS },
          removeOnComplete: { age: NOTIFICATION_JOB_RETENTION_SECONDS },
          removeOnFail: { age: NOTIFICATION_JOB_RETENTION_SECONDS },
        },
      })),
    )
    return { channels: channels.length }
  }

  private async deliver(data: DeliveryJob): Promise<NotifyOutcome> {
    const [context, channel] = await Promise.all([
      this.notifications.findIncident(data.incidentId),
      this.notifications.findChannel(data.channelId),
    ])
    if (!context) return { skipped: 'incident no longer exists' }
    if (!channel?.enabled) return { skipped: 'channel removed or disabled' }

    const message = buildIncidentMessage(context, data.transition, this.dashboardUrl, new Date())
    const result = await this.send(channel, message)
    if (result.delivered) return result

    // Retrying cannot fix a server with no mail settings, so stop straight away.
    const reason = result.error ?? 'Delivery failed'
    if (reason === EMAIL_NOT_CONFIGURED) throw new UnrecoverableError(reason)
    throw new Error(reason)
  }

  private async test(data: TestDeliveryJob): Promise<NotifyOutcome> {
    const channel = await this.notifications.findChannel(data.channelId)
    if (!channel) return { delivered: false, statusCode: null, error: 'Channel not found' }
    return this.send(channel, buildTestMessage(new Date()))
  }

  private send(channel: NotificationChannel, message: Message): Promise<ChannelTestResult> {
    return channel.type === CHANNEL_TYPE.webhook
      ? this.webhooks.send(channel.target, channel.secret ?? '', message)
      : this.email.send(channel.target, message)
  }
}
