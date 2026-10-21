// The Redis pub/sub channel the worker publishes to and every api instance
// listens on, whichever instance a browser's stream happens to be held by.
export const LIVE_EVENTS_CHANNEL = 'uptime:live-events'

export const LIVE_EVENT_TYPES = {
  monitorChecked: 'monitor.checked',
  incidentOpened: 'incident.opened',
  incidentClosed: 'incident.closed',
} as const

export type LiveEventType = (typeof LIVE_EVENT_TYPES)[keyof typeof LIVE_EVENT_TYPES]
