import { TRANSITION, WEBHOOK_EVENTS } from '@uptime/shared'

import {
  buildIncidentMessage,
  buildTestMessage,
  formatDuration,
  type IncidentContext,
} from './message.js'

const SENT_AT = new Date('2026-10-08T14:51:00Z')

const context = (endedAt: Date | null): IncidentContext => ({
  incident: { id: 3, startedAt: new Date('2026-10-08T14:32:00Z'), endedAt, cause: 'HTTP 502' },
  monitor: {
    id: 7,
    name: 'Payments API',
    url: 'https://pay.example.com/health',
    failureThreshold: 2,
    userId: 1,
  },
})

describe('buildIncidentMessage', () => {
  it('says what, since when and why for a monitor going down', () => {
    const message = buildIncidentMessage(
      context(null),
      TRANSITION.down,
      'https://app.test',
      SENT_AT,
    )

    expect(message.text.split('\n')).toEqual([
      'DOWN  Payments API (pay.example.com)',
      'Started 14:32 UTC · HTTP 502 after 2 consecutive failures',
      'https://app.test/monitors/7',
    ])
    expect(message.subject).toBe('DOWN: Payments API')
    expect(message.event).toBe(WEBHOOK_EVENTS.down)
  })

  it('states how long the outage lasted on recovery', () => {
    const message = buildIncidentMessage(
      context(new Date('2026-10-08T14:51:00Z')),
      TRANSITION.recovered,
      'https://app.test',
      SENT_AT,
    )

    expect(message.text.split('\n')[1]).toBe('Recovered 14:51 UTC · Down for 19 minutes')
    expect(message.payload).toMatchObject({
      event: WEBHOOK_EVENTS.recovered,
      monitor: { id: 7, name: 'Payments API' },
      incident: { id: 3, durationSeconds: 1140, cause: 'HTTP 502' },
    })
  })

  it('puts the same text in the webhook body, which is what Slack displays', () => {
    const message = buildIncidentMessage(
      context(null),
      TRANSITION.down,
      'https://app.test',
      SENT_AT,
    )

    expect(message.payload.text).toBe(message.text)
  })
})

describe('buildTestMessage', () => {
  it('is marked as a test so receivers can tell it apart', () => {
    expect(buildTestMessage(SENT_AT).payload).toMatchObject({ event: WEBHOOK_EVENTS.test })
  })
})

describe('formatDuration', () => {
  it.each([
    [1, '1 second'],
    [45, '45 seconds'],
    [60, '1 minute'],
    [1_140, '19 minutes'],
    [3_600, '1 hour'],
    [3_900, '1 hour 5 minutes'],
    [7_260, '2 hours 1 minute'],
  ])('%i seconds reads as "%s"', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected)
  })
})
