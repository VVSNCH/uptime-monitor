export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

export const REQUEST_TIMEOUT_MS = 15_000

export const API_ENDPOINTS = {
  health: '/health',
  login: '/auth/login',
  register: '/auth/register',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  logoutAll: '/auth/logout-all',
  password: '/auth/password',
  monitors: '/monitors',
  monitor: (id: number) => `/monitors/${id}`,
  monitorPause: (id: number) => `/monitors/${id}/pause`,
  monitorResume: (id: number) => `/monitors/${id}/resume`,
  monitorCheck: (id: number) => `/monitors/${id}/check`,
  monitorStats: (id: number) => `/monitors/${id}/stats`,
  monitorChecks: (id: number) => `/monitors/${id}/checks`,
  monitorIncidents: (id: number) => `/monitors/${id}/incidents`,
  incidents: '/incidents',
  channels: '/channels',
  channel: (id: number) => `/channels/${id}`,
  channelTest: (id: number) => `/channels/${id}/test`,
} as const

// Requests that must never trigger a token refresh: they are how a session
// starts or ends, so a 401 from them is the real answer.
export const AUTH_PATHS = [
  API_ENDPOINTS.login,
  API_ENDPOINTS.register,
  API_ENDPOINTS.refresh,
  API_ENDPOINTS.logout,
]

export const CLIENT_ERROR_CODES = {
  network: 'NETWORK_ERROR',
  timeout: 'TIMEOUT',
  unknown: 'UNKNOWN_ERROR',
} as const

export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES]
