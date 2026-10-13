import type { MonitorSummary } from '@uptime/shared'
import { describe, expect, it } from 'vitest'

import { summarizeMonitors, toDisplayStatus } from './monitorStatus'

function monitor(overrides: Partial<MonitorSummary> = {}): MonitorSummary {
  return {
    id: 1,
    name: 'Payments API',
    url: 'https://pay.example.com',
    status: 'UP',
    isStale: false,
    lastCheckedAt: '2026-10-12T11:59:00Z',
    lastResponseMs: 120,
    uptime24h: 1,
    isSeeded: false,
    ...overrides,
  }
}

describe('toDisplayStatus', () => {
  it('shows a stale monitor as unknown, whatever it last said', () => {
    expect(toDisplayStatus(monitor({ status: 'UP', isStale: true }))).toBe('unknown')
    expect(toDisplayStatus(monitor({ status: 'DOWN', isStale: true }))).toBe('unknown')
  })

  it('shows a paused monitor as paused, never stale', () => {
    expect(toDisplayStatus(monitor({ status: 'PAUSED', isStale: true }))).toBe('paused')
  })

  it('shows a never-checked monitor as waiting', () => {
    expect(toDisplayStatus(monitor({ status: 'PENDING' }))).toBe('pending')
  })
})

describe('summarizeMonitors', () => {
  it('counts up, down and paused', () => {
    const overview = summarizeMonitors([
      monitor({ status: 'UP' }),
      monitor({ status: 'DOWN' }),
      monitor({ status: 'PAUSED' }),
    ])

    expect(overview).toMatchObject({ upCount: 1, downCount: 1, pausedCount: 1, isStalled: false })
  })

  it('reports checks as stopped when every monitor that should run is stale', () => {
    const overview = summarizeMonitors([
      monitor({ isStale: true, lastCheckedAt: '2026-10-12T11:00:00Z' }),
      monitor({ isStale: true, lastCheckedAt: '2026-10-12T11:30:00Z' }),
      monitor({ status: 'PAUSED' }),
    ])

    expect(overview.isStalled).toBe(true)
    expect(overview.lastCheckedAt).toBe('2026-10-12T11:30:00Z')
  })

  it('does not call one slow monitor a stopped system', () => {
    const overview = summarizeMonitors([monitor({ isStale: true }), monitor()])

    expect(overview.isStalled).toBe(false)
  })
})
