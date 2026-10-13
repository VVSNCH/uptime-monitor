import { type QueryKey, useQuery, type UseQueryOptions } from '@tanstack/react-query'

import type { ApiRequestError } from '../services/apiError'
import { api } from '../services/http'

type ApiQueryOptions<TData> = Omit<UseQueryOptions<TData, ApiRequestError>, 'queryKey' | 'queryFn'>

// The url can be a function, worked out when each request is made, for
// queries that depend on the current time such as "the last 24 hours".
export function useApiQuery<TData>(
  queryKey: QueryKey,
  url: string | (() => string),
  options: ApiQueryOptions<TData> = {},
) {
  return useQuery<TData, ApiRequestError>({
    queryKey,
    queryFn: ({ signal }) => api.get<TData>(typeof url === 'function' ? url() : url, { signal }),
    ...options,
  })
}
