import type {
  ChannelResponse,
  ChannelTestResult,
  CreateChannelRequest,
  UpdateChannelRequest,
} from '@uptime/shared'

import { API_ENDPOINTS } from '../constants/api'
import { QUERY_KEYS } from '../constants/query'
import { useApiMutation } from './useApiMutation'
import { useApiQuery } from './useApiQuery'

interface ChannelUpdate extends UpdateChannelRequest {
  id: number
}

export function useChannels() {
  return useApiQuery<ChannelResponse[]>(QUERY_KEYS.channels, API_ENDPOINTS.channels)
}

export function useCreateChannel() {
  return useApiMutation<CreateChannelRequest, ChannelResponse>('post', API_ENDPOINTS.channels, {
    invalidates: [QUERY_KEYS.channels],
  })
}

export function useUpdateChannel() {
  return useApiMutation<ChannelUpdate, ChannelResponse>(
    'patch',
    ({ id }) => API_ENDPOINTS.channel(id),
    { invalidates: [QUERY_KEYS.channels], toBody: ({ id: _id, ...changes }) => changes },
  )
}

export function useDeleteChannel() {
  return useApiMutation<number>('delete', (id) => API_ENDPOINTS.channel(id), {
    invalidates: [QUERY_KEYS.channels],
  })
}

export function useTestChannel() {
  return useApiMutation<number, ChannelTestResult>('post', (id) => API_ENDPOINTS.channelTest(id), {
    toBody: () => undefined,
  })
}
