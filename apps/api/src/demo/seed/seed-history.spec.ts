import { MONITOR_STATUS } from '@uptime/shared'

import { SEED_PROFILES } from './demo-monitors.js'
import { createRandom, generateHistory, type SeedProfile } from './seed-history.js'

const NOW = new Date('2026-10-09T15:42:10.000Z')
const DAYS = 90
const FIVE_MINUTES = 300_000

const PROFILE: SeedProfile = {
  name: 'Marketing site',
  url: 'https://example.com',
  intervalSeconds: 300,
  baseResponseMs: 180,
  incidentCount: 4,
  causes: ['HTTP 503', 'Connection refused'],
}

const generate = (profile = PROFILE, seed = 1) =>
  generateHistory(profile, NOW, createRandom(seed), DAYS)

describe('generateHistory', () => {
  it('produces the same history from the same seed', () => {
    expect(generate()).toEqual(generate())
    expect(generate(PROFILE, 2)).not.toEqual(generate(PROFILE, 1))
  })

  it('rolls up every full day before yesterday, each with a full day of checks', () => {
    const { dailyStats } = generate()

    expect(dailyStats).toHaveLength(DAYS - 2)
    expect(dailyStats[0]?.day.toISOString()).toBe('2026-07-12T00:00:00.000Z')
    expect(dailyStats.at(-1)?.day.toISOString()).toBe('2026-10-07T00:00:00.000Z')
    for (const day of dailyStats) expect(day.upCount + day.downCount).toBe(288)
  })

  it('keeps yesterday and today as raw checks, one per interval, all finished by now', () => {
    const { checks } = generate()

    expect(checks[0]?.scheduledFor.toISOString()).toBe('2026-10-08T00:00:00.000Z')
    for (const [index, check] of checks.entries()) {
      expect(check.scheduledFor.getTime() - (checks[0]?.scheduledFor.getTime() ?? 0)).toBe(
        index * FIVE_MINUTES,
      )
      expect(check.checkedAt.getTime()).toBeLessThan(NOW.getTime())
    }
  })

  it('closes every incident, in order and without overlap, at a passing check', () => {
    const { incidents } = generate()

    expect(incidents).toHaveLength(4)
    for (const [index, incident] of incidents.entries()) {
      expect(incident.endedAt).not.toBeNull()
      expect(incident.endedAt?.getTime()).toBeGreaterThan(incident.startedAt.getTime())
      const next = incidents[index + 1]
      if (next) expect(next.startedAt.getTime()).toBeGreaterThan(incident.endedAt?.getTime() ?? 0)
    }
  })

  it('counts an incident’s failed checks in its day', () => {
    const history = generate({ ...PROFILE, incidentCount: 1 })
    const [incident] = history.incidents
    const day = history.dailyStats.find(
      (entry) =>
        entry.day.toISOString().slice(0, 10) === incident?.startedAt.toISOString().slice(0, 10),
    )

    expect(day?.downCount).toBeGreaterThanOrEqual(2)
  })

  it('shapes failures like the checker does', () => {
    const { checks } = generateHistory(
      { ...PROFILE, incidentCount: 0, openIncidentMinutes: 30, causes: ['Connection refused'] },
      NOW,
      createRandom(1),
      DAYS,
    )
    const failed = checks.filter((check) => !check.ok)

    expect(failed.length).toBeGreaterThanOrEqual(6)
    expect(failed.at(-1)).toMatchObject({
      statusCode: null,
      responseMs: null,
      error: 'Connection refused',
    })
  })

  it('leaves an open incident running to now, with the monitor down', () => {
    const history = generate({ ...PROFILE, openIncidentMinutes: 95 })
    const open = history.incidents.filter((incident) => incident.endedAt === null)

    expect(open).toHaveLength(1)
    expect(history.status).toBe(MONITOR_STATUS.down)
    expect(history.consecutiveFailures).toBe(19)
    expect(history.checks.at(-1)?.ok).toBe(false)
    expect(NOW.getTime() - (open[0]?.startedAt.getTime() ?? 0)).toBeGreaterThan(90 * 60_000)
  })

  it('ends up for a monitor with no open incident', () => {
    expect(generate().status).toBe(MONITOR_STATUS.up)
  })

  it('places every demo profile’s incidents', () => {
    for (const [index, profile] of SEED_PROFILES.entries()) {
      const history = generateHistory(profile, NOW, createRandom(index), DAYS)
      const expected = profile.incidentCount + (profile.openIncidentMinutes ? 1 : 0)

      expect(history.incidents).toHaveLength(expected)
    }
  })
})
