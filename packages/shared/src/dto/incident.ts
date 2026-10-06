export interface IncidentResponse {
  id: number
  monitorId: number
  monitorName: string
  startedAt: string
  endedAt: string | null
  durationSeconds: number | null
  cause: string
}
