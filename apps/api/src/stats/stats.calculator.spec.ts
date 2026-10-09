import { fillDays, rawFrom, statsRange, summarize } from './stats.calculator.js'

const NOW = new Date('2026-10-09T15:30:00.000Z')

describe('statsRange', () => {
  it('reads 24h as the rolling 24 hours before now', () => {
    expect(statsRange('24h', NOW)).toEqual({
      from: new Date('2026-10-08T15:30:00.000Z'),
      to: NOW,
      firstDay: null,
      today: null,
      dayCount: 0,
    })
  })

  it('reads 7d as seven whole UTC days, today included', () => {
    const range = statsRange('7d', NOW)

    expect(range.firstDay?.toISOString()).toBe('2026-10-03T00:00:00.000Z')
    expect(range.today?.toISOString()).toBe('2026-10-09T00:00:00.000Z')
    expect(range.from).toEqual(range.firstDay)
    expect(range.dayCount).toBe(7)
  })

  it('covers 90 days for the uptime bar', () => {
    expect(statsRange('90d', NOW).firstDay?.toISOString()).toBe('2026-07-12T00:00:00.000Z')
  })
})

describe('rawFrom', () => {
  const firstDay = new Date('2026-10-03T00:00:00.000Z')

  it('starts the day after the last rolled-up day', () => {
    const rolledUp = [{ day: '2026-10-07', upCount: 1, downCount: 0, avgResponseMs: 100 }]

    expect(rawFrom(firstDay, rolledUp).toISOString()).toBe('2026-10-08T00:00:00.000Z')
  })

  it('reads the whole window from raw checks before the first rollup', () => {
    expect(rawFrom(firstDay, [])).toEqual(firstDay)
  })
})

describe('fillDays', () => {
  it('returns every day in order, with zero counts where nothing was checked', () => {
    const days = fillDays(
      new Date('2026-10-07T00:00:00.000Z'),
      3,
      [{ day: '2026-10-07', upCount: 10, downCount: 2, avgResponseMs: 120 }],
      [{ day: '2026-10-09', upCount: 4, downCount: 0, avgResponseMs: 90 }],
    )

    expect(days).toEqual([
      { day: '2026-10-07', upCount: 10, downCount: 2, avgResponseMs: 120 },
      { day: '2026-10-08', upCount: 0, downCount: 0, avgResponseMs: null },
      { day: '2026-10-09', upCount: 4, downCount: 0, avgResponseMs: 90 },
    ])
  })
})

describe('summarize', () => {
  it('weights the average by successful checks', () => {
    expect(
      summarize([
        { upCount: 3, downCount: 1, avgResponseMs: 100 },
        { upCount: 1, downCount: 0, avgResponseMs: 500 },
      ]),
    ).toEqual({ uptime: 0.8, avgResponseMs: 200, checkCount: 5 })
  })

  it('has no uptime or average without checks', () => {
    expect(summarize([{ upCount: 0, downCount: 0, avgResponseMs: null }])).toEqual({
      uptime: null,
      avgResponseMs: null,
      checkCount: 0,
    })
  })

  it('reports zero uptime, not none, when every check failed', () => {
    expect(summarize([{ upCount: 0, downCount: 4, avgResponseMs: null }])).toMatchObject({
      uptime: 0,
      avgResponseMs: null,
    })
  })
})
