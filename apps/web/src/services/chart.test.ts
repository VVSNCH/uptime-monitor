import type { CheckResult } from '@uptime/shared'
import { describe, expect, it } from 'vitest'

import { toChartPoints } from './chart'

function check(minute: number, ok: boolean, responseMs: number | null): CheckResult {
  const at = new Date(Date.UTC(2026, 9, 12, 12, minute)).toISOString()
  return {
    id: String(minute),
    scheduledFor: at,
    checkedAt: at,
    ok,
    statusCode: ok ? 200 : 503,
    responseMs,
    error: ok ? null : 'HTTP 503',
  }
}

describe('toChartPoints', () => {
  it('keeps every check when there are few enough', () => {
    const points = toChartPoints([check(0, true, 100), check(1, true, 200)], 10)

    expect(points.map((point) => point.responseMs)).toEqual([100, 200])
  })

  it('averages successful checks into buckets when there are too many', () => {
    const checks = [
      check(0, true, 100),
      check(1, true, 300),
      check(2, true, 50),
      check(3, true, 70),
    ]

    expect(toChartPoints(checks, 2).map((point) => point.responseMs)).toEqual([200, 60])
  })

  it('leaves a gap where every check in a bucket failed, and marks it', () => {
    const [point] = toChartPoints([check(0, false, null), check(1, false, 80)], 1)

    expect(point).toMatchObject({ responseMs: null, hasFailure: true })
  })
})
