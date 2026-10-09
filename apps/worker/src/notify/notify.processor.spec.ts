import { ConfigService } from '@nestjs/config'
import type { NotificationChannel } from '@uptime/database'
import {
  CHANNEL_TYPE,
  type ChannelTestResult,
  JOB_NAMES,
  TRANSITION,
  WEBHOOK_EVENTS,
} from '@uptime/shared'
import { type Job, type Queue, UnrecoverableError } from 'bullmq'

import { EMAIL_NOT_CONFIGURED, type EmailChannel } from './email.channel.js'
import type { IncidentContext, Message } from './message.js'
import { type NotificationQueueJob, NotifyProcessor } from './notify.processor.js'
import type { NotifyRepository } from './notify.repository.js'
import type { WebhookChannel } from './webhook.channel.js'

const CONTEXT: IncidentContext = {
  incident: {
    id: 3,
    startedAt: new Date('2026-10-08T14:32:00Z'),
    endedAt: null,
    cause: 'HTTP 502',
  },
  monitor: {
    id: 7,
    name: 'Payments API',
    url: 'https://pay.example.com',
    failureThreshold: 2,
    userId: 1,
  },
}

const channel = (
  id: number,
  overrides: Partial<NotificationChannel> = {},
): NotificationChannel => ({
  id,
  userId: 1,
  type: CHANNEL_TYPE.webhook,
  target: `https://hooks.example.com/${id}`,
  secret: 'whsec_x',
  enabled: true,
  sendOnDown: true,
  sendOnRecover: true,
  createdAt: new Date(),
  ...overrides,
})

const DELIVERED: ChannelTestResult = { delivered: true, statusCode: 200, error: null }

function setup(channels: NotificationChannel[], result: ChannelTestResult = DELIVERED) {
  const sent: { target: string; message: Message }[] = []
  const queued: { name: string; data: unknown; opts: { jobId?: string } }[] = []
  const send = async (target: string, ...rest: unknown[]) => {
    sent.push({ target, message: rest.at(-1) as Message })
    return result
  }
  const repository = {
    findIncident: async () => CONTEXT,
    channelsToNotify: async () => channels,
    findChannel: async (id: number) => channels.find((candidate) => candidate.id === id) ?? null,
  }
  const queue = {
    addBulk: async (jobs: { name: string; data: unknown; opts: { jobId?: string } }[]) => {
      queued.push(...jobs)
    },
  }
  const processor = new NotifyProcessor(
    repository as unknown as NotifyRepository,
    { send } as unknown as WebhookChannel,
    { send } as unknown as EmailChannel,
    queue as unknown as Queue<NotificationQueueJob>,
    new ConfigService({ APP_PUBLIC_URL: 'https://app.test' }),
  )
  const run = (name: string, data: unknown, id = 'incident-3-DOWN') =>
    processor.process({ name, data, id } as unknown as Job<NotificationQueueJob>)
  return { processor, run, sent, queued }
}

describe('NotifyProcessor', () => {
  describe('notify', () => {
    it('queues one delivery per channel, each with its own id', async () => {
      const { run, queued } = setup([channel(1), channel(2)])

      expect(await run(JOB_NAMES.notify, { incidentId: 3, transition: TRANSITION.down })).toEqual({
        channels: 2,
      })
      expect(queued.map((job) => [job.name, job.opts.jobId])).toEqual([
        [JOB_NAMES.deliver, 'incident-3-DOWN-channel-1'],
        [JOB_NAMES.deliver, 'incident-3-DOWN-channel-2'],
      ])
    })
  })

  describe('deliver', () => {
    it('sends the alert to the channel', async () => {
      const { run, sent } = setup([channel(1)])

      await run(JOB_NAMES.deliver, { incidentId: 3, transition: TRANSITION.down, channelId: 1 })

      expect(sent).toHaveLength(1)
      expect(sent[0]?.target).toBe('https://hooks.example.com/1')
      expect(sent[0]?.message.event).toBe(WEBHOOK_EVENTS.down)
    })

    it('fails so BullMQ retries when the receiver is down', async () => {
      const { run } = setup([channel(1)], {
        delivered: false,
        statusCode: 503,
        error: 'The receiver answered HTTP 503',
      })

      await expect(
        run(JOB_NAMES.deliver, { incidentId: 3, transition: TRANSITION.down, channelId: 1 }),
      ).rejects.toThrow('The receiver answered HTTP 503')
    })

    it('stops retrying when email is not set up, since retrying cannot help', async () => {
      const { run } = setup([channel(1, { type: CHANNEL_TYPE.email, target: 'ops@example.com' })], {
        delivered: false,
        statusCode: null,
        error: EMAIL_NOT_CONFIGURED,
      })

      await expect(
        run(JOB_NAMES.deliver, { incidentId: 3, transition: TRANSITION.down, channelId: 1 }),
      ).rejects.toBeInstanceOf(UnrecoverableError)
    })

    it('skips a channel that was disabled after the alert was queued', async () => {
      const { run, sent } = setup([channel(1, { enabled: false })])

      expect(
        await run(JOB_NAMES.deliver, { incidentId: 3, transition: TRANSITION.down, channelId: 1 }),
      ).toEqual({ skipped: 'channel removed or disabled' })
      expect(sent).toHaveLength(0)
    })
  })

  describe('test delivery', () => {
    it('returns what the channel reported instead of throwing', async () => {
      const failure = { delivered: false, statusCode: 404, error: 'The receiver answered HTTP 404' }
      const { run } = setup([channel(1)], failure)

      expect(await run(JOB_NAMES.testDelivery, { channelId: 1 })).toEqual(failure)
    })
  })
})
