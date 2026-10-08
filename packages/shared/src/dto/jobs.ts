import type { Transition } from '../constants/notification.js'

// Scheduled checks share one template, so the occurrence they belong to comes
// from the job itself. A check run on demand carries the moment it was asked for.
export interface CheckJob {
  monitorId: number
  requestedAt?: string
}

export interface NotificationJob {
  incidentId: number
  transition: Transition
}

export interface RollupJob {
  day: string
}
