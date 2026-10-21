import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@uptime/database/nest'
import { RegistrationService } from '@uptime/service-registry/nest'

import type { Env } from '../config/env.js'
import {
  HEALTH_CHECK_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
} from '../constants/index.js'

export type HeartbeatOutcome = 'sent' | 'skipped' | 'failed'

// This system cannot report its own total failure, so the worker reports that
// it is alive to something outside it, such as healthchecks.io or Better Stack,
// which alerts when the pings stop. A ping is sent only while the worker can
// reach the database and Redis, so a worker that cannot do its job goes quiet.
@Injectable()
export class HeartbeatService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(HeartbeatService.name)
  private readonly url: string | undefined
  private timer?: NodeJS.Timeout

  constructor(
    @Inject(ConfigService) config: ConfigService<Env, true>,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RegistrationService) private readonly registration: RegistrationService,
  ) {
    this.url = config.get('HEARTBEAT_URL', { infer: true })
  }

  onApplicationBootstrap(): void {
    if (!this.url) return
    this.timer = setInterval(() => void this.beat(), HEARTBEAT_INTERVAL_MS)
    this.timer.unref()
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer)
  }

  async beat(): Promise<HeartbeatOutcome> {
    if (!this.url) return 'skipped'

    const [isDatabaseUp, isRedisUp] = await Promise.all([
      this.prisma.isReachable(HEALTH_CHECK_TIMEOUT_MS),
      this.registration.isRedisReachable(),
    ])
    if (!isDatabaseUp || !isRedisUp) {
      this.logger.warn('Heartbeat withheld: the database or Redis is unreachable')
      return 'skipped'
    }

    try {
      const response = await fetch(this.url, { signal: AbortSignal.timeout(HEARTBEAT_TIMEOUT_MS) })
      if (response.ok) return 'sent'
      this.logger.warn(`Heartbeat endpoint answered HTTP ${response.status}`)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Heartbeat could not be sent: ${reason}`)
    }
    return 'failed'
  }
}
