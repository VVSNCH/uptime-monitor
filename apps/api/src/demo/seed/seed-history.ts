import { MONITOR_LIMITS, MONITOR_STATUS, type MonitorStatus } from '@uptime/shared'

import { MS_PER_DAY } from '../../constants/index.js'

const MS_PER_SECOND = 1_000
const MS_PER_MINUTE = 60_000
const HTTP_CAUSE = /^HTTP (\d{3})$/
// A blip is one failed check on its own, below the failure threshold, so it
// shows in the history without opening an incident. Counted per day rather
// than per check, so a one-minute monitor is not five times as flaky as a
// five-minute one.
const BLIPS_PER_DAY = 0.15
const SPIKE_RATE = 0.01
const INCIDENT_GAP = 3
const PLACEMENT_ATTEMPTS = 50

export interface SeedProfile {
  name: string
  url: string
  intervalSeconds: number
  baseResponseMs: number
  // Closed incidents spread over the history.
  incidentCount: number
  // An incident that started this many minutes ago and is still open.
  openIncidentMinutes?: number
  // What failing checks report, such as "HTTP 503" or "Connection refused".
  causes: readonly [string, ...string[]]
}

export interface SeededCheck {
  scheduledFor: Date
  checkedAt: Date
  ok: boolean
  statusCode: number | null
  responseMs: number | null
  error: string | null
}

export interface SeededIncident {
  startedAt: Date
  endedAt: Date | null
  cause: string
}

export interface SeededDay {
  day: Date
  upCount: number
  downCount: number
  avgResponseMs: number | null
}

export interface SeededHistory {
  dailyStats: SeededDay[]
  checks: SeededCheck[]
  incidents: SeededIncident[]
  status: MonitorStatus
  consecutiveFailures: number
  lastCheckedAt: Date | null
  lastResponseMs: number | null
}

interface Outage {
  from: number
  length: number
  cause: string
  startedAt?: Date
  endedAt?: Date
}

interface DayTally {
  upCount: number
  downCount: number
  totalMs: number
}

// A small seeded generator, so the same profile always produces the same
// history and the tests can rely on it.
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

// Plays the monitor's checks forward from the first day of the history to now,
// the same way the checker would have recorded them. Days before yesterday
// become daily rollups; yesterday and today become raw checks, so the nightly
// rollup reproduces yesterday exactly and the response chart has data.
export function generateHistory(
  profile: SeedProfile,
  now: Date,
  random: () => number,
  historyDays: number,
): SeededHistory {
  const intervalMs = profile.intervalSeconds * MS_PER_SECOND
  const today = startOfUtcDay(now)
  const start = new Date(today.getTime() - (historyDays - 1) * MS_PER_DAY)
  const rawFrom = new Date(today.getTime() - MS_PER_DAY)
  // The last occurrence is at least one interval old, so it has finished.
  const count = Math.floor((now.getTime() - start.getTime()) / intervalMs)
  const blipChance = (BLIPS_PER_DAY * intervalMs) / MS_PER_DAY

  const outages = planOutages(profile, count, intervalMs, random)
  const days: DayTally[] = Array.from({ length: historyDays - 2 }, () => ({
    upCount: 0,
    downCount: 0,
    totalMs: 0,
  }))
  const checks: SeededCheck[] = []
  let consecutiveFailures = 0
  let lastCheckedAt: Date | null = null
  let lastResponseMs: number | null = null
  let wasBlip = false
  let next = 0

  for (let index = 0; index < count; index++) {
    let outage = outages[next]
    while (outage && index >= outage.from + outage.length) outage = outages[++next]
    const previous = outages[next - 1]

    const isInOutage = outage !== undefined && index >= outage.from
    const isNearOutage =
      (outage !== undefined && index >= outage.from - INCIDENT_GAP) ||
      (previous !== undefined && index < previous.from + previous.length + INCIDENT_GAP)
    const isBlip: boolean = !isNearOutage && !wasBlip && random() < blipChance
    wasBlip = isBlip

    const scheduledFor = new Date(start.getTime() + index * intervalMs)
    let result = passedCheck(profile, random)
    if (outage && isInOutage) result = failedCheck(outage.cause, profile)
    else if (isBlip) result = failedCheck(pick(profile.causes, random), profile)
    const checkedAt = new Date(scheduledFor.getTime() + (result.responseMs ?? 0))

    // The incident runs from the first failed check to the first one that passed.
    if (index === outage?.from) outage.startedAt = checkedAt
    if (previous && index === previous.from + previous.length) previous.endedAt = checkedAt

    consecutiveFailures = result.ok ? 0 : consecutiveFailures + 1
    lastCheckedAt = checkedAt
    lastResponseMs = result.responseMs

    if (scheduledFor < rawFrom) {
      const tally = days[Math.floor((scheduledFor.getTime() - start.getTime()) / MS_PER_DAY)]
      if (!tally) continue
      if (result.ok) {
        tally.upCount++
        tally.totalMs += result.responseMs ?? 0
      } else {
        tally.downCount++
      }
    } else {
      checks.push({ scheduledFor, checkedAt, ...result })
    }
  }

  return {
    dailyStats: days.map((tally, index) => ({
      day: new Date(start.getTime() + index * MS_PER_DAY),
      upCount: tally.upCount,
      downCount: tally.downCount,
      avgResponseMs: tally.upCount === 0 ? null : Math.round(tally.totalMs / tally.upCount),
    })),
    checks,
    incidents: outages.map((outage) => ({
      startedAt: outage.startedAt ?? start,
      endedAt: outage.endedAt ?? null,
      cause: outage.cause,
    })),
    status:
      consecutiveFailures >= MONITOR_LIMITS.failureThreshold.default
        ? MONITOR_STATUS.down
        : MONITOR_STATUS.up,
    consecutiveFailures,
    lastCheckedAt,
    lastResponseMs,
  }
}

// Mostly short outages with the occasional long one, never overlapping and
// never touching, each long enough to pass the failure threshold. The open
// one, if any, runs to the end.
function planOutages(
  profile: SeedProfile,
  count: number,
  intervalMs: number,
  random: () => number,
): Outage[] {
  const outages: Outage[] = []
  let end = count
  if (profile.openIncidentMinutes) {
    const length = Math.max(
      1,
      Math.ceil((profile.openIncidentMinutes * MS_PER_MINUTE) / intervalMs),
    )
    outages.push({ from: count - length, length, cause: profile.causes[0] })
    end = count - length - INCIDENT_GAP
  }

  for (let placed = 0; placed < profile.incidentCount; placed++) {
    for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
      const minutes = random() < 0.75 ? 4 + random() * 20 : 30 + random() * 120
      const length = Math.max(
        MONITOR_LIMITS.failureThreshold.default,
        Math.round((minutes * MS_PER_MINUTE) / intervalMs),
      )
      // Ends before the last occurrence so its recovery check exists.
      const from = Math.floor(random() * (end - length - 1))
      const isOverlapping = outages.some(
        (other) =>
          from < other.from + other.length + INCIDENT_GAP &&
          other.from < from + length + INCIDENT_GAP,
      )
      if (from >= 0 && !isOverlapping) {
        outages.push({ from, length, cause: pick(profile.causes, random) })
        break
      }
    }
  }
  return outages.sort((a, b) => a.from - b.from)
}

type CheckOutcome = Omit<SeededCheck, 'scheduledFor' | 'checkedAt'>

function passedCheck(profile: SeedProfile, random: () => number): CheckOutcome {
  const spike = random() < SPIKE_RATE ? profile.baseResponseMs * 3 : 0
  const responseMs = Math.round(profile.baseResponseMs * (0.8 + 0.4 * random()) + spike)
  return { ok: true, statusCode: 200, responseMs, error: null }
}

// Shaped like the checker's own results: an HTTP failure has a status and a
// time, a network failure has neither.
function failedCheck(cause: string, profile: SeedProfile): CheckOutcome {
  const status = HTTP_CAUSE.exec(cause)?.[1]
  if (!status) return { ok: false, statusCode: null, responseMs: null, error: cause }
  const responseMs = Math.round(profile.baseResponseMs / 2)
  return { ok: false, statusCode: Number(status), responseMs, error: cause }
}

function pick<T>(items: readonly [T, ...T[]], random: () => number): T {
  return items[Math.floor(random() * items.length)] ?? items[0]
}

function startOfUtcDay(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()))
}
