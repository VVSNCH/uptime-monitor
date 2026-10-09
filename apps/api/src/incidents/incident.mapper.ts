import type { IncidentResponse } from '@uptime/shared'

import type { IncidentWithMonitor } from './incidents.repository.js'

const MS_PER_SECOND = 1_000

export function toIncidentResponse(incident: IncidentWithMonitor): IncidentResponse {
  return {
    id: incident.id,
    monitorId: incident.monitorId,
    monitorName: incident.monitor.name,
    startedAt: incident.startedAt.toISOString(),
    endedAt: incident.endedAt?.toISOString() ?? null,
    durationSeconds: incident.endedAt
      ? Math.round((incident.endedAt.getTime() - incident.startedAt.getTime()) / MS_PER_SECOND)
      : null,
    cause: incident.cause,
  }
}
