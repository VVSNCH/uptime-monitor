import {
  Inject,
  Injectable,
  Logger,
  type MessageEvent,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LIVE_EVENT_TYPES, LIVE_EVENTS_CHANNEL, type PublishedLiveEvent } from '@uptime/shared'
import { Redis } from 'ioredis'
import { filter, interval, map, merge, type Observable, Subject } from 'rxjs'

import type { Env } from '../config/env.js'
import { LIVE_ERROR_LOG_INTERVAL_MS, LIVE_STREAM_PING_MS } from '../constants/index.js'

export const PING_EVENT = 'ping'

const EVENT_TYPES = new Set<string>(Object.values(LIVE_EVENT_TYPES))

// One Redis subscription per api instance, fanned out to every open stream on
// it. A browser can be connected to any instance, so every instance hears
// every event and each stream keeps only its own user's.
@Injectable()
export class LiveEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiveEventsService.name)
  private readonly events = new Subject<PublishedLiveEvent>()
  private subscriber?: Redis
  private lastErrorAt = 0

  constructor(@Inject(ConfigService) private readonly config: ConfigService<Env, true>) {}

  onModuleInit(): void {
    // A subscriber keeps retrying through an outage and resubscribes on its
    // own once Redis is back.
    this.subscriber = new Redis(this.config.get('REDIS_URL', { infer: true }), {
      maxRetriesPerRequest: null,
    })
    this.subscriber.on('message', (_channel: string, message: string) => this.receive(message))
    this.subscriber.on('error', (error: Error) => this.logError(error))
    this.subscriber.subscribe(LIVE_EVENTS_CHANNEL).catch((error: unknown) => this.logError(error))
  }

  async onModuleDestroy(): Promise<void> {
    this.events.complete()
    await this.subscriber?.quit().catch(() => undefined)
  }

  // Anything that is not a well-formed event is dropped rather than trusted.
  receive(message: string): void {
    let parsed: unknown
    try {
      parsed = JSON.parse(message)
    } catch {
      return
    }
    if (isPublishedEvent(parsed)) this.events.next(parsed)
  }

  // The ping keeps the connection busy, so no proxy along the way closes it
  // as idle, and lets the browser notice a dead connection.
  streamFor(userId: number): Observable<MessageEvent> {
    const own = this.events.pipe(
      filter((event) => event.userId === userId),
      map(({ type, monitorId }) => ({ type, data: { type, monitorId } })),
    )
    const pings = interval(LIVE_STREAM_PING_MS).pipe(map(() => ({ type: PING_EVENT, data: {} })))
    return merge(own, pings)
  }

  private logError(error: unknown): void {
    const now = Date.now()
    if (now - this.lastErrorAt < LIVE_ERROR_LOG_INTERVAL_MS) return
    this.lastErrorAt = now
    const reason = error instanceof Error ? error.message || error.name : String(error)
    this.logger.warn(`Live updates unavailable: ${reason}`)
  }
}

function isPublishedEvent(value: unknown): value is PublishedLiveEvent {
  if (typeof value !== 'object' || value === null) return false
  const event = value as Record<string, unknown>
  return (
    typeof event.type === 'string' &&
    EVENT_TYPES.has(event.type) &&
    Number.isInteger(event.monitorId) &&
    Number.isInteger(event.userId)
  )
}
