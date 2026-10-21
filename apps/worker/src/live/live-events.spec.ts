import { LIVE_EVENT_TYPES, MONITOR_STATUS, TRANSITION, type Transition } from '@uptime/shared'

import type { CheckOutcome } from '../check/check-runner.service.js'
import { liveEventsFor } from './live-events.js'

const recorded = (transition: Transition | null): CheckOutcome => ({
  status: 'recorded',
  userId: 7,
  result: { ok: true, statusCode: 200, responseMs: 120, error: null },
  monitorStatus: MONITOR_STATUS.up,
  transition,
  incidentId: transition ? 3 : null,
})

describe('liveEventsFor', () => {
  it('refreshes the monitor after every recorded check, for its owner only', () => {
    expect(liveEventsFor(42, recorded(null))).toEqual([
      { type: LIVE_EVENT_TYPES.monitorChecked, monitorId: 42, userId: 7 },
    ])
  })

  it('also refreshes incidents when an outage starts or ends', () => {
    expect(liveEventsFor(42, recorded(TRANSITION.down)).map((event) => event.type)).toEqual([
      LIVE_EVENT_TYPES.monitorChecked,
      LIVE_EVENT_TYPES.incidentOpened,
    ])
    expect(liveEventsFor(42, recorded(TRANSITION.recovered)).map((event) => event.type)).toEqual([
      LIVE_EVENT_TYPES.monitorChecked,
      LIVE_EVENT_TYPES.incidentClosed,
    ])
  })

  it('says nothing about a check that was skipped or repeated', () => {
    expect(liveEventsFor(42, { status: 'skipped', reason: 'paused' })).toEqual([])
    expect(liveEventsFor(42, { status: 'duplicate' })).toEqual([])
  })
})
