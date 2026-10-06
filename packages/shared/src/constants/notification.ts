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
