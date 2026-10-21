import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LIVE_EVENTS_CHANNEL, type PublishedLiveEvent } from '@uptime/shared'
import { Redis } from 'ioredis'

import type { Env } from '../config/env.js'
import { LIVE_EVENT_ERROR_LOG_INTERVAL_MS, REDIS_COMMAND_TIMEOUT_MS } from '../constants/index.js'

// Live updates are a convenience: the dashboard also polls, so an event lost
// while Redis is away costs a few seconds of freshness, never data. Publishing
// therefore fails fast and quietly instead of holding up a check.
@Injectable()
export class LiveEventPublisher implements OnModuleDestroy {
  private readonly logger = new Logger(LiveEventPublisher.name)
  private readonly redis: Redis
  private lastErrorAt = 0

  constructor(@Inject(ConfigService) config: ConfigService<Env, true>) {
    this.redis = new Redis(config.get('REDIS_URL', { infer: true }), {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
    })
    this.redis.on('error', (error: Error) => this.logError(error))
  }

  async publish(events: PublishedLiveEvent[]): Promise<void> {
    try {
      await Promise.all(
        events.map((event) => this.redis.publish(LIVE_EVENTS_CHANNEL, JSON.stringify(event))),
      )
    } catch (error) {
      this.logError(error)
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined)
  }

  private logError(error: unknown): void {
    const now = Date.now()
    if (now - this.lastErrorAt < LIVE_EVENT_ERROR_LOG_INTERVAL_MS) return
    this.lastErrorAt = now
    const reason = error instanceof Error ? error.message || error.name : String(error)
    this.logger.warn(`Live updates unavailable: ${reason}`)
  }
}
