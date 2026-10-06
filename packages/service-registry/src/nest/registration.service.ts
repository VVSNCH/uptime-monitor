import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common'
import type { Redis } from 'ioredis'

import { ServiceRegistry } from '../service-registry.js'
import type { Registration } from '../types.js'
import { REGISTRY_REDIS } from './tokens.js'

@Injectable()
export class RegistrationService implements OnApplicationShutdown {
  private registration?: Registration

  constructor(
    @Inject(REGISTRY_REDIS) private readonly redis: Redis,
    @Inject(ServiceRegistry) private readonly registry: ServiceRegistry,
  ) {}

  async register(service: string, url: string): Promise<void> {
    this.registration = await this.registry.register(service, url)
    this.redis.on('ready', this.handleReconnect)
  }

  async isRedisReachable(): Promise<boolean> {
    try {
      await this.redis.ping()
      return true
    } catch {
      return false
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.redis.off('ready', this.handleReconnect)
    await this.registration?.stop()
    await this.redis.quit().catch(() => this.redis.disconnect())
  }

  private readonly handleReconnect = () => {
    void this.registration?.heartbeat()
  }
}
