export interface CheckResult {
  id: string
  scheduledFor: string
  checkedAt: string
  ok: boolean
  statusCode: number | null
  responseMs: number | null
  error: string | null
}

export interface CheckHistoryQuery {
  from?: string
  to?: string
}
