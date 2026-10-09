import { InjectQueue } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import { JOB_NAMES, type NotificationJob, QUEUE_NAMES, type Transition } from '@uptime/shared'
import type { Queue } from 'bullmq'

import { NOTIFICATION_JOB_RETENTION_SECONDS, NOTIFY_ATTEMPTS } from '../constants/index.js'

// The job id is the status change itself, so asking twice for the same change
// queues one job and sends one alert.
export function notifyJobId(incidentId: number, transition: Transition): string {
  return `incident-${incidentId}-${transition}`
}

@Injectable()
export class NotificationProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.notifications) private readonly queue: Queue<NotificationJob>,
  ) {}

  async enqueue(incidentId: number, transition: Transition): Promise<void> {
    await this.queue.add(
      JOB_NAMES.notify,
      { incidentId, transition },
      {
        jobId: notifyJobId(incidentId, transition),
        attempts: NOTIFY_ATTEMPTS,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: { age: NOTIFICATION_JOB_RETENTION_SECONDS },
        removeOnFail: { age: NOTIFICATION_JOB_RETENTION_SECONDS },
      },
    )
  }
}
