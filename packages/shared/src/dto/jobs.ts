import type { Transition } from '../constants/notification.js'

// Scheduled checks share one template, so the occurrence they belong to comes
// from the job itself. A check run on demand carries the moment it was asked for.
export interface CheckJob {
  monitorId: number
  requestedAt?: string
}

// One per status change. The worker turns it into one DeliveryJob per channel,
// so each channel retries on its own.
export interface NotificationJob {
  incidentId: number
  transition: Transition
}

export interface DeliveryJob extends NotificationJob {
  channelId: number
}

export interface TestDeliveryJob {
  channelId: number
}

export interface RollupJob {
  day: string
}
