import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, type TimeZoneMode } from '../constants/time'

const EMPTY = '—'
const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3_600
const SECONDS_PER_DAY = 86_400

export function formatPercent(value: number | null): string {
  if (value === null) return EMPTY
  if (value === 1) return '100%'
  // Two decimals: the difference between 99.9% and 99.99% is the whole point.
  return `${Math.min(value * 100, 99.99).toFixed(2)}%`
}

export function formatResponseTime(ms: number | null): string {
  if (ms === null) return EMPTY
  return ms < 1_000 ? `${ms} ms` : `${(ms / 1_000).toFixed(1)} s`
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < SECONDS_PER_MINUTE) return plural(Math.max(totalSeconds, 1), 'second')
  if (totalSeconds < SECONDS_PER_HOUR) {
    return plural(Math.round(totalSeconds / SECONDS_PER_MINUTE), 'minute')
  }
  if (totalSeconds < SECONDS_PER_DAY) {
    const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR)
    const minutes = Math.round((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
    return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
  }
  const days = Math.floor(totalSeconds / SECONDS_PER_DAY)
  const hours = Math.round((totalSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR)
  return hours === 0 ? plural(days, 'day') : `${plural(days, 'day')} ${hours} h`
}

const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'long' })

export function formatRelative(iso: string, now: number): string {
  const elapsedMs = now - new Date(iso).getTime()
  if (elapsedMs < MS_PER_MINUTE) return 'just now'
  if (elapsedMs < MS_PER_HOUR) {
    return relativeFormat.format(-Math.floor(elapsedMs / MS_PER_MINUTE), 'minute')
  }
  if (elapsedMs < MS_PER_DAY) {
    return relativeFormat.format(-Math.floor(elapsedMs / MS_PER_HOUR), 'hour')
  }
  return relativeFormat.format(-Math.floor(elapsedMs / MS_PER_DAY), 'day')
}

export function formatDateTime(value: string | Date, mode: TimeZoneMode): string {
  const formatted = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: mode === 'utc' ? 'UTC' : undefined,
  }).format(new Date(value))
  return mode === 'utc' ? `${formatted} UTC` : formatted
}

export function formatTimeOfDay(value: Date, mode: TimeZoneMode): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: mode === 'utc' ? 'UTC' : undefined,
  }).format(value)
}

export function formatShortDate(value: Date, mode: TimeZoneMode): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: mode === 'utc' ? 'UTC' : undefined,
  }).format(value)
}

// Days are UTC calendar days on the server, so they are shown as such.
export function formatDay(isoDay: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${isoDay}T00:00:00Z`))
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}
