import type { ChannelType } from '../constants/notification.js'

export interface ChannelResponse {
  id: number
  type: ChannelType
  target: string
  enabled: boolean
  sendOnDown: boolean
  sendOnRecover: boolean
  /** Webhook channels only: the key that signs each delivery. */
  signingSecret: string | null
  createdAt: string
}

export interface CreateChannelRequest {
  type: ChannelType
  target: string
  sendOnDown?: boolean
  sendOnRecover?: boolean
}

export interface UpdateChannelRequest {
  target?: string
  enabled?: boolean
  sendOnDown?: boolean
  sendOnRecover?: boolean
}

export interface ChannelTestResult {
  delivered: boolean
  statusCode: number | null
  error: string | null
}
