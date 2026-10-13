import { useQueryClient } from '@tanstack/react-query'
import type {
  CheckResult,
  CreateMonitorRequest,
  MonitorDetail,
  MonitorSummary,
  StatsWindow,
  UpdateMonitorRequest,
  UptimeStats,
} from '@uptime/shared'

import { API_ENDPOINTS } from '../constants/api'
import { LIVE_REFRESH_MS, QUERY_KEYS } from '../constants/query'
import { MS_PER_HOUR } from '../constants/time'
import { withQuery } from '../services/http'
import { useApiMutation } from './useApiMutation'
import { useApiQuery } from './useApiQuery'

// An on-demand check takes a moment to run, so its result is fetched shortly
// after it is queued rather than straight away.
const CHECK_RESULT_DELAY_MS = 3_000

export function useMonitors() {
  return useApiQuery<MonitorSummary[]>(QUERY_KEYS.monitors, API_ENDPOINTS.monitors, {
    refetchInterval: LIVE_REFRESH_MS,
  })
}

export function useMonitor(id: number) {
  return useApiQuery<MonitorDetail>(QUERY_KEYS.monitor(id), API_ENDPOINTS.monitor(id), {
    refetchInterval: LIVE_REFRESH_MS,
  })
}

export function useMonitorStats(id: number, window: StatsWindow) {
  return useApiQuery<UptimeStats>(
    QUERY_KEYS.monitorStats(id, window),
    withQuery(API_ENDPOINTS.monitorStats(id), { window }),
    { refetchInterval: LIVE_REFRESH_MS },
  )
}

export function useMonitorChecks(id: number, hours: number) {
  return useApiQuery<CheckResult[]>(QUERY_KEYS.monitorChecks(id, hours), () =>
    withQuery(API_ENDPOINTS.monitorChecks(id), {
      from: new Date(Date.now() - hours * MS_PER_HOUR).toISOString(),
    }),
  )
}

export function useCreateMonitor() {
  return useApiMutation<CreateMonitorRequest, MonitorDetail>('post', API_ENDPOINTS.monitors, {
    invalidates: [QUERY_KEYS.monitors],
  })
}

export function useUpdateMonitor(id: number) {
  return useApiMutation<UpdateMonitorRequest, MonitorDetail>('patch', API_ENDPOINTS.monitor(id), {
    invalidates: [QUERY_KEYS.monitors],
  })
}

export function useDeleteMonitor(id: number) {
  return useApiMutation('delete', API_ENDPOINTS.monitor(id), {
    invalidates: [QUERY_KEYS.monitors, QUERY_KEYS.incidents],
  })
}

export function useSetMonitorPaused(id: number) {
  return useApiMutation<boolean, MonitorDetail>(
    'post',
    (isPaused) => (isPaused ? API_ENDPOINTS.monitorPause(id) : API_ENDPOINTS.monitorResume(id)),
    { invalidates: [QUERY_KEYS.monitors], toBody: () => undefined },
  )
}

export function useCheckNow(id: number) {
  const queryClient = useQueryClient()
  return useApiMutation('post', API_ENDPOINTS.monitorCheck(id), {
    onSuccess: () => {
      setTimeout(
        () => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.monitor(id) }),
        CHECK_RESULT_DELAY_MS,
      )
    },
  })
}
