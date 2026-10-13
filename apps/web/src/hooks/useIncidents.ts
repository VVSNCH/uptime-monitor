import type { IncidentResponse } from '@uptime/shared'

import { API_ENDPOINTS } from '../constants/api'
import { LIVE_REFRESH_MS, QUERY_KEYS } from '../constants/query'
import { withQuery } from '../services/http'
import { useApiQuery } from './useApiQuery'

const INCIDENT_LIMIT = 100

export function useIncidents(isOpenOnly: boolean) {
  return useApiQuery<IncidentResponse[]>(
    QUERY_KEYS.incidentList(isOpenOnly),
    withQuery(API_ENDPOINTS.incidents, { open: isOpenOnly, limit: INCIDENT_LIMIT }),
    { refetchInterval: LIVE_REFRESH_MS },
  )
}

export function useMonitorIncidents(monitorId: number) {
  return useApiQuery<IncidentResponse[]>(
    QUERY_KEYS.monitorIncidents(monitorId),
    withQuery(API_ENDPOINTS.monitorIncidents(monitorId), { limit: INCIDENT_LIMIT }),
    { refetchInterval: LIVE_REFRESH_MS },
  )
}
