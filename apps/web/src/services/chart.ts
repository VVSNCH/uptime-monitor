import type { CheckResult } from '@uptime/shared'

export interface ChartPoint {
  at: Date
  // Average of the successful checks in the bucket, or null if none passed.
  responseMs: number | null
  hasFailure: boolean
}

// A week of one-minute checks is ten thousand points, more than a chart can
// show apart. Checks are averaged into at most maxPoints buckets instead.
export function toChartPoints(checks: CheckResult[], maxPoints: number): ChartPoint[] {
  const bucketSize = Math.max(1, Math.ceil(checks.length / maxPoints))
  const points: ChartPoint[] = []

  for (let start = 0; start < checks.length; start += bucketSize) {
    const bucket = checks.slice(start, start + bucketSize)
    const passed = bucket.filter((check) => check.ok && check.responseMs !== null)
    const totalMs = passed.reduce((sum, check) => sum + (check.responseMs ?? 0), 0)
    const first = bucket[0]
    if (!first) continue
    points.push({
      at: new Date(first.checkedAt),
      responseMs: passed.length === 0 ? null : Math.round(totalMs / passed.length),
      hasFailure: bucket.some((check) => !check.ok),
    })
  }
  return points
}
