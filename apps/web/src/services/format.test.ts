import { describe, expect, it } from 'vitest'

import { formatDuration, formatPercent, formatRelative, formatResponseTime } from './format'

describe('formatPercent', () => {
  it('keeps two decimals, where the differences that matter are', () => {
    expect(formatPercent(0.99753)).toBe('99.75%')
  })

  it('never rounds a failing day up to a perfect one', () => {
    expect(formatPercent(0.99999)).toBe('99.99%')
    expect(formatPercent(1)).toBe('100%')
  })

  it('shows a dash rather than 0% when there is nothing to measure', () => {
    expect(formatPercent(null)).toBe('—')
  })
})

describe('formatDuration', () => {
  it('reads naturally at every scale', () => {
    expect(formatDuration(7)).toBe('7 seconds')
    expect(formatDuration(60)).toBe('1 minute')
    expect(formatDuration(19 * 60)).toBe('19 minutes')
    expect(formatDuration(2 * 3_600 + 14 * 60)).toBe('2 h 14 min')
    expect(formatDuration(3 * 86_400 + 4 * 3_600)).toBe('3 days 4 h')
  })
})

describe('formatRelative', () => {
  const now = Date.parse('2026-10-12T12:00:00Z')

  it('counts back from now', () => {
    expect(formatRelative('2026-10-12T11:59:30Z', now)).toBe('just now')
    expect(formatRelative('2026-10-12T11:46:00Z', now)).toBe('14 minutes ago')
    expect(formatRelative('2026-10-12T09:00:00Z', now)).toBe('3 hours ago')
    expect(formatRelative('2026-10-11T10:00:00Z', now)).toBe('yesterday')
  })
})

describe('formatResponseTime', () => {
  it('switches to seconds past one second', () => {
    expect(formatResponseTime(240)).toBe('240 ms')
    expect(formatResponseTime(1_840)).toBe('1.8 s')
    expect(formatResponseTime(null)).toBe('—')
  })
})
