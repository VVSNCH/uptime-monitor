import type { MessageEvent } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { LIVE_EVENT_TYPES } from '@uptime/shared'

import type { Env } from '../config/env.js'
import { LiveEventsService, PING_EVENT } from './live-events.service.js'

// Built without onModuleInit, so no Redis connection: messages are fed in
// the way the subscription would deliver them.
function service() {
  return new LiveEventsService({} as ConfigService<Env, true>)
}

function collect(live: LiveEventsService, userId: number) {
  const received: MessageEvent[] = []
  const subscription = live.streamFor(userId).subscribe((event) => {
    if (event.type !== PING_EVENT) received.push(event)
  })
  return { received, stop: () => subscription.unsubscribe() }
}

const message = (
  userId: number,
  monitorId: number,
  type: string = LIVE_EVENT_TYPES.monitorChecked,
) => JSON.stringify({ type, monitorId, userId })

describe('LiveEventsService', () => {
  it('sends each user only the events for their own monitors', () => {
    const live = service()
    const alice = collect(live, 1)
    const bob = collect(live, 2)

    live.receive(message(1, 10))
    live.receive(message(2, 20, LIVE_EVENT_TYPES.incidentOpened))

    expect(alice.received).toEqual([
      {
        type: LIVE_EVENT_TYPES.monitorChecked,
        data: { type: LIVE_EVENT_TYPES.monitorChecked, monitorId: 10 },
      },
    ])
    expect(bob.received.map((event) => event.type)).toEqual([LIVE_EVENT_TYPES.incidentOpened])
    alice.stop()
    bob.stop()
  })

  it('never sends the owner id to the browser', () => {
    const live = service()
    const alice = collect(live, 1)

    live.receive(message(1, 10))

    expect(alice.received[0]?.data).not.toHaveProperty('userId')
    alice.stop()
  })

  it('drops anything that is not a well-formed event', () => {
    const live = service()
    const alice = collect(live, 1)

    live.receive('not json')
    live.receive(JSON.stringify({ type: 'monitor.deleted', monitorId: 10, userId: 1 }))
    live.receive(
      JSON.stringify({ type: LIVE_EVENT_TYPES.monitorChecked, monitorId: '10', userId: 1 }),
    )

    expect(alice.received).toEqual([])
    alice.stop()
  })
})
