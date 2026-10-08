import type { Monitor } from '@uptime/database'
import { MONITOR_STATUS } from '@uptime/shared'

import { isStale, toMonitorDetail, toMonitorSummary } from './monitor.mapper.js'

const NOW = new Date('2026-10-06T12:00:00Z')
const MINUTE = 60_000

function monitor(overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: 1,
    userId: 1,
    name: 'Payments API',
    url: 'https://pay.example.com/health',
    method: 'GET',
    intervalSeconds: 60,
    timeoutMs: 10_000,
    expectedStatus: null,
    failureThreshold: 2,
    paused: false,
    isSeeded: false,
    status: MONITOR_STATUS.up,
    consecutiveFailures: 0,
    lastCheckedAt: new Date(NOW.getTime() - MINUTE),
    lastResponseMs: 120,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    updatedAt: new Date('2026-10-01T00:00:00Z'),
    ...overrides,
  }
}

describe('isStale', () => {
  it('is fresh within three intervals of the last check', () => {
    expect(isStale(monitor({ lastCheckedAt: new Date(NOW.getTime() - 3 * MINUTE) }), NOW)).toBe(
      false,
    )
  })

  it('is stale once three intervals pass without a check', () => {
    expect(isStale(monitor({ lastCheckedAt: new Date(NOW.getTime() - 3 * MINUTE - 1) }), NOW)).toBe(
      true,
    )
  })

  it('scales with the monitor’s own interval', () => {
    const hourly = monitor({
      intervalSeconds: 3600,
      lastCheckedAt: new Date(NOW.getTime() - 60 * MINUTE),
    })

    expect(isStale(hourly, NOW)).toBe(false)
  })

  it('measures a never-checked monitor from when it was created', () => {
    const justCreated = monitor({
      lastCheckedAt: null,
      createdAt: new Date(NOW.getTime() - MINUTE),
    })
    const neverRan = monitor({
      lastCheckedAt: null,
      createdAt: new Date(NOW.getTime() - 10 * MINUTE),
    })

    expect(isStale(justCreated, NOW)).toBe(false)
    expect(isStale(neverRan, NOW)).toBe(true)
  })

  it('never calls a paused monitor stale', () => {
    expect(isStale(monitor({ paused: true, lastCheckedAt: new Date(0) }), NOW)).toBe(false)
  })
})

describe('toMonitorSummary', () => {
  it('reports a paused monitor as PAUSED whatever its last status', () => {
    expect(
      toMonitorSummary(monitor({ paused: true, status: MONITOR_STATUS.down }), NOW).status,
    ).toBe(MONITOR_STATUS.paused)
  })

  it('sends dates as ISO strings', () => {
    expect(toMonitorSummary(monitor(), NOW).lastCheckedAt).toBe('2026-10-06T11:59:00.000Z')
  })
})

describe('toMonitorDetail', () => {
  it('refuses a stored interval outside the allowed set', () => {
    expect(() => toMonitorDetail(monitor({ intervalSeconds: 42 }), NOW)).toThrow(/interval/)
  })
})
