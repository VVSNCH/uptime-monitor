import type { AuthResponse } from '@uptime/shared'
import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios'

import { API_ENDPOINTS, API_URL, AUTH_PATHS, REQUEST_TIMEOUT_MS } from '../constants/api'
import { toApiRequestError } from './apiError'
import { session } from './session'

interface RetriableConfig extends InternalAxiosRequestConfig {
  isRetry?: boolean
}

// withCredentials lets the refresh cookie travel to the gateway, which runs
// on another port and so counts as another origin.
export const httpClient = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let pendingRefresh: Promise<AuthResponse | null> | null = null

// Resolves null when there is no session to renew, and rejects when the api
// could not be asked. Concurrent callers share one request, because each
// refresh token works once: a second use would be treated as theft.
export function refreshSession(): Promise<AuthResponse | null> {
  pendingRefresh ??= httpClient
    .post<AuthResponse>(API_ENDPOINTS.refresh)
    .then(({ data }) => {
      session.setAccessToken(data.accessToken)
      return data
    })
    .catch((error: unknown) => {
      if (toApiRequestError(error).statusCode === 401) return null
      throw error
    })
    .finally(() => {
      pendingRefresh = null
    })
  return pendingRefresh
}

httpClient.interceptors.request.use((config) => {
  const token = session.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// An expired access token is renewed once and the request replayed, so a
// session outlives the token's 15 minutes without the user noticing.
httpClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const apiError = toApiRequestError(error)
    const config = isAxiosError(error) ? (error.config as RetriableConfig | undefined) : undefined
    const isRenewable =
      apiError.statusCode === 401 &&
      config !== undefined &&
      !config.isRetry &&
      !AUTH_PATHS.some((path) => config.url === path)

    if (isRenewable) {
      const renewed = await refreshSession().catch(() => undefined)
      if (renewed) {
        config.isRetry = true
        config.headers.Authorization = `Bearer ${renewed.accessToken}`
        return httpClient(config)
      }
      if (renewed === null) session.expire()
    }
    throw apiError
  },
)

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.get<T>(url, config).then(({ data }) => data),

  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    httpClient.post<T>(url, body, config).then(({ data }) => data),

  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    httpClient.put<T>(url, body, config).then(({ data }) => data),

  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    httpClient.patch<T>(url, body, config).then(({ data }) => data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.delete<T>(url, config).then(({ data }) => data),
}

export function withQuery(url: string, params: Record<string, string | number | boolean>): string {
  const search = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  )
  return `${url}?${search.toString()}`
}
