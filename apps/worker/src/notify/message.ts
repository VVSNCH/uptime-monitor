import { TRANSITION, type Transition, WEBHOOK_EVENTS, type WebhookEvent } from '@uptime/shared'

export interface IncidentContext {
  incident: { id: number; startedAt: Date; endedAt: Date | null; cause: string }
  monitor: { id: number; name: string; url: string; failureThreshold: number; userId: number }
}

export interface Message {
  event: WebhookEvent
  subject: string
  text: string
  payload: Record<string, unknown>
}

const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3_600
const MS_PER_SECOND = 1_000

// The first line answers what, since when and why, so the alert is useful
// even when only a notification preview is seen.
export function buildIncidentMessage(
  context: IncidentContext,
  transition: Transition,
  dashboardUrl: string,
  sentAt: Date,
): Message {
  const { incident, monitor } = context
  const host = hostOf(monitor.url)
  const durationSeconds = incident.endedAt
    ? Math.round((incident.endedAt.getTime() - incident.startedAt.getTime()) / MS_PER_SECOND)
    : null

  const isDown = transition === TRANSITION.down
  const headline = isDown ? `DOWN  ${monitor.name} (${host})` : `UP  ${monitor.name} (${host})`
  const detail = isDown
    ? `Started ${clockTime(incident.startedAt)} UTC · ${incident.cause} after ${monitor.failureThreshold} consecutive ${monitor.failureThreshold === 1 ? 'failure' : 'failures'}`
    : `Recovered ${clockTime(incident.endedAt ?? sentAt)} UTC · Down for ${formatDuration(durationSeconds ?? 0)}`
  const text = `${headline}\n${detail}\n${dashboardUrl}/monitors/${monitor.id}`

  return {
    event: isDown ? WEBHOOK_EVENTS.down : WEBHOOK_EVENTS.recovered,
    subject: isDown ? `DOWN: ${monitor.name}` : `Recovered: ${monitor.name}`,
    text,
    payload: {
      text,
      event: isDown ? WEBHOOK_EVENTS.down : WEBHOOK_EVENTS.recovered,
      monitor: { id: monitor.id, name: monitor.name, url: monitor.url },
      incident: {
        id: incident.id,
        startedAt: incident.startedAt.toISOString(),
        endedAt: incident.endedAt?.toISOString() ?? null,
        durationSeconds,
        cause: incident.cause,
      },
      sentAt: sentAt.toISOString(),
    },
  }
}

export function buildTestMessage(sentAt: Date): Message {
  const text = 'Test from Uptime Monitor\nThis channel is set up correctly and will receive alerts.'
  return {
    event: WEBHOOK_EVENTS.test,
    subject: 'Uptime Monitor test',
    text,
    payload: { text, event: WEBHOOK_EVENTS.test, sentAt: sentAt.toISOString() },
  }
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < SECONDS_PER_MINUTE) return plural(totalSeconds, 'second')
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR)
  const minutes = Math.round((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  if (hours === 0) return plural(minutes, 'minute')
  return minutes === 0
    ? plural(hours, 'hour')
    : `${plural(hours, 'hour')} ${plural(minutes, 'minute')}`
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}

function clockTime(date: Date): string {
  return date.toISOString().slice(11, 16)
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
