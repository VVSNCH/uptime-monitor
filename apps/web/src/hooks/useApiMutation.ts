import {
  type QueryKey,
  useMutation,
  type UseMutationOptions,
  useQueryClient,
} from '@tanstack/react-query'

import type { ApiRequestError } from '../services/apiError'
import { api } from '../services/http'

export type MutationMethod = 'post' | 'put' | 'patch' | 'delete'

interface ApiMutationOptions<TVariables, TData> extends Omit<
  UseMutationOptions<TData, ApiRequestError, TVariables>,
  'mutationFn'
> {
  invalidates?: QueryKey[]
  toBody?: (variables: TVariables) => unknown
}

export function useApiMutation<TVariables = void, TData = void>(
  method: MutationMethod,
  url: string | ((variables: TVariables) => string),
  { invalidates = [], toBody, onSuccess, ...options }: ApiMutationOptions<TVariables, TData> = {},
) {
  const queryClient = useQueryClient()

  return useMutation<TData, ApiRequestError, TVariables>({
    mutationFn: (variables) => {
      const path = typeof url === 'function' ? url(variables) : url
      if (method === 'delete') return api.delete<TData>(path)
      return api[method]<TData>(path, toBody ? toBody(variables) : variables)
    },
    onSuccess: async (...args) => {
      await Promise.all(invalidates.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      await onSuccess?.(...args)
    },
    ...options,
  })
}
