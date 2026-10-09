import { daysToRollUp, parseIsoDay, retentionCutoff, toIsoDay } from './day.js'

const NOW = new Date('2026-10-09T00:05:00.000Z')

describe('daysToRollUp', () => {
  it('returns the full days before today, oldest first', () => {
    expect(daysToRollUp(NOW, 3).map(toIsoDay)).toEqual(['2026-10-06', '2026-10-07', '2026-10-08'])
  })

  it('never includes today, however late in the day it runs', () => {
    const lateNight = new Date('2026-10-09T23:59:59.999Z')

    expect(daysToRollUp(lateNight, 1).map(toIsoDay)).toEqual(['2026-10-08'])
  })
})

describe('retentionCutoff', () => {
  it('falls on a UTC midnight, so whole days are pruned', () => {
    expect(retentionCutoff(NOW, 30).toISOString()).toBe('2026-09-09T00:00:00.000Z')
  })
})

describe('parseIsoDay', () => {
  it('reads a calendar day as UTC midnight', () => {
    expect(parseIsoDay('2026-10-08')?.toISOString()).toBe('2026-10-08T00:00:00.000Z')
  })

  it('refuses anything that is not a real day', () => {
    expect(parseIsoDay('2026-02-30')).toBeNull()
    expect(parseIsoDay('2026-10-08T10:00:00Z')).toBeNull()
    expect(parseIsoDay('yesterday')).toBeNull()
  })
})
