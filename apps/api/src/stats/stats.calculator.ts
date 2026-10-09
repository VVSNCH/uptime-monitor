import type { DailyUptime, StatsWindow } from '@uptime/shared'

import { MS_PER_DAY } from '../constants/index.js'
import type { CheckTotals, DayTotals } from '../history/history.repository.js'

const DAYS_IN_WINDOW: Record<Exclude<StatsWindow, '24h'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}
const MS_PER_HOUR = 3_600_000

export interface StatsRange {
  from: Date
  to: Date
  // Calendar windows only: the first UTC day, the start of today, and how many
  // days that spans with today included.
  firstDay: Date | null
  today: Date | null
  dayCount: number
}

export interface Summary {
  uptime: number | null
  avgResponseMs: number | null
  checkCount: number
}

// 24h is a rolling window read from raw checks. The others are whole UTC days
// ending today, so each day lines up with one cell of the uptime bar.
export function statsRange(window: StatsWindow, now: Date): StatsRange {
  if (window === '24h') {
    return {
      from: new Date(now.getTime() - 24 * MS_PER_HOUR),
      to: now,
      firstDay: null,
      today: null,
      dayCount: 0,
    }
  }
  const dayCount = DAYS_IN_WINDOW[window]
  const today = startOfUtcDay(now)
  const firstDay = addDays(today, 1 - dayCount)
  return { from: firstDay, to: now, firstDay, today, dayCount }
}

// Days the rollup has not written yet, usually just today (and yesterday until
// the nightly run), are read from raw checks instead.
export function rawFrom(firstDay: Date, rolledUp: DayTotals[]): Date {
  const last = rolledUp.at(-1)
  return last ? addDays(new Date(`${last.day}T00:00:00.000Z`), 1) : firstDay
}

// One entry per day, so the client can draw the bar without filling gaps. A
// day with no checks has zero counts rather than being left out.
export function fillDays(
  firstDay: Date,
  dayCount: number,
  rolledUp: DayTotals[],
  raw: DayTotals[],
): DailyUptime[] {
  const known = new Map([...raw, ...rolledUp].map((entry) => [entry.day, entry]))
  return Array.from({ length: dayCount }, (_, index) => {
    const day = toIsoDay(addDays(firstDay, index))
    const entry = known.get(day)
    return {
      day,
      upCount: entry?.upCount ?? 0,
      downCount: entry?.downCount ?? 0,
      avgResponseMs: entry?.avgResponseMs ?? null,
    }
  })
}

// The average is weighted by each day's successful checks, so a quiet day does
// not count as much as a full one.
export function summarize(parts: CheckTotals[]): Summary {
  let upCount = 0
  let downCount = 0
  let weightedMs = 0
  let weight = 0
  for (const part of parts) {
    upCount += part.upCount
    downCount += part.downCount
    if (part.avgResponseMs !== null && part.upCount > 0) {
      weightedMs += part.avgResponseMs * part.upCount
      weight += part.upCount
    }
  }
  const checkCount = upCount + downCount
  return {
    uptime: checkCount === 0 ? null : upCount / checkCount,
    avgResponseMs: weight === 0 ? null : Math.round(weightedMs / weight),
    checkCount,
  }
}

function startOfUtcDay(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()))
}

function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * MS_PER_DAY)
}

function toIsoDay(day: Date): string {
  return day.toISOString().slice(0, 10)
}
