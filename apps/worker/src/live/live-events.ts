import { LIVE_EVENT_TYPES, type PublishedLiveEvent, TRANSITION } from '@uptime/shared'

import type { CheckOutcome } from '../check/check-runner.service.js'

// Every recorded check refreshes the monitor; a status change also refreshes
// the incident lists. Skipped and repeated checks changed nothing.
export function liveEventsFor(monitorId: number, outcome: CheckOutcome): PublishedLiveEvent[] {
  if (outcome.status !== 'recorded') return []

  const base = { monitorId, userId: outcome.userId }
  const events: PublishedLiveEvent[] = [{ ...base, type: LIVE_EVENT_TYPES.monitorChecked }]
  if (outcome.transition === TRANSITION.down) {
    events.push({ ...base, type: LIVE_EVENT_TYPES.incidentOpened })
  }
  if (outcome.transition === TRANSITION.recovered) {
    events.push({ ...base, type: LIVE_EVENT_TYPES.incidentClosed })
  }
  return events
}
