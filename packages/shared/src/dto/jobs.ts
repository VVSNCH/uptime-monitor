import type { Transition } from '../constants/notification.js'

export interface CheckJob {
  monitorId: number
  scheduledFor: string
}

export interface NotificationJob {
  incidentId: number
  transition: Transition
}

export interface RollupJob {
  day: string
}
