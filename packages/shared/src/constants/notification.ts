export const CHANNEL_TYPE = {
  email: 'EMAIL',
  webhook: 'WEBHOOK',
} as const

export type ChannelType = (typeof CHANNEL_TYPE)[keyof typeof CHANNEL_TYPE]

export const TRANSITION = {
  down: 'DOWN',
  recovered: 'RECOVERED',
} as const

export type Transition = (typeof TRANSITION)[keyof typeof TRANSITION]

// Sent with every webhook so the receiver can check it came from us and is
// recent: the signature is an HMAC-SHA256 of "<timestamp>.<raw body>" keyed with
// the channel's signing secret, sent as "sha256=<hex>".
export const WEBHOOK_HEADERS = {
  signature: 'x-uptime-signature',
  timestamp: 'x-uptime-timestamp',
  event: 'x-uptime-event',
} as const

export const WEBHOOK_EVENTS = {
  down: 'monitor.down',
  recovered: 'monitor.recovered',
  test: 'test',
} as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS]
