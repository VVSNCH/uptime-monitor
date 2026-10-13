import { QueryClient } from '@tanstack/react-query'

import { QUERY_MAX_RETRIES, QUERY_STALE_TIME_MS } from '../constants/query'
import { toApiRequestError } from './apiError'

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (toApiRequestError(error).isClientError) return false
  return failureCount < QUERY_MAX_RETRIES
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
})
