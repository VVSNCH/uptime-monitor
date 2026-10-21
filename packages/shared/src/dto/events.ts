import type { LiveEventType } from '../constants/events.js'

// Sent down /events. It says what changed, not the new data: the dashboard
// refetches what it shows, so the stream never has to keep every view in sync.
export interface LiveEvent {
  type: LiveEventType
  monitorId: number
}

// What crosses Redis. The owner is used to pick whose streams it goes to and
// never reaches the browser.
export interface PublishedLiveEvent extends LiveEvent {
  userId: number
}
