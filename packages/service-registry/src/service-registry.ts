import { randomUUID } from 'node:crypto'

import { HEARTBEAT_INTERVAL_MS, INSTANCE_TTL_MS, REGISTRY_KEY_PREFIX } from './constants.js'
import type { ErrorHandler, Registration, RegistryStore, ServiceInstance } from './types.js'

export interface ServiceRegistryOptions {
  heartbeatIntervalMs?: number
  instanceTtlMs?: number
  now?: () => number
  onError?: ErrorHandler
}

export class ServiceRegistry {
  private readonly heartbeatIntervalMs: number
  private readonly instanceTtlMs: number
  private readonly now: () => number
  private readonly onError?: ErrorHandler

  constructor(
    private readonly store: RegistryStore,
    options: ServiceRegistryOptions = {},
  ) {
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS
    this.instanceTtlMs = options.instanceTtlMs ?? INSTANCE_TTL_MS
    this.now = options.now ?? Date.now
    this.onError = options.onError
  }

  async register(service: string, url: string): Promise<Registration> {
    const key = keyFor(service)
    const instanceId = randomUUID()

    const heartbeat = async () => {
      const instance: ServiceInstance = { instanceId, url, lastSeen: this.now() }
      try {
        await this.store.hset(key, instanceId, JSON.stringify(instance))
      } catch (error) {
        this.onError?.(error)
      }
    }

    await heartbeat()
    const timer = setInterval(() => void heartbeat(), this.heartbeatIntervalMs)
    timer.unref()

    return {
      instanceId,
      heartbeat,
      stop: async () => {
        clearInterval(timer)
        try {
          await this.store.hdel(key, instanceId)
        } catch (error) {
          this.onError?.(error)
        }
      },
    }
  }

  async instances(service: string): Promise<ServiceInstance[]> {
    const key = keyFor(service)
    const entries = await this.store.hgetall(key)
    const cutoff = this.now() - this.instanceTtlMs

    const live: ServiceInstance[] = []
    const expired: string[] = []
    for (const [field, raw] of Object.entries(entries)) {
      const instance = parseInstance(raw)
      if (instance && instance.lastSeen >= cutoff) {
        live.push(instance)
      } else {
        expired.push(field)
      }
    }

    // A crashed instance never deregisters, so readers clean up after it.
    if (expired.length > 0) {
      await this.store.hdel(key, ...expired)
    }

    return live.sort((a, b) => a.instanceId.localeCompare(b.instanceId))
  }
}

function keyFor(service: string): string {
  return `${REGISTRY_KEY_PREFIX}${service}`
}

function parseInstance(raw: string): ServiceInstance | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'instanceId' in value &&
    typeof value.instanceId === 'string' &&
    'url' in value &&
    typeof value.url === 'string' &&
    'lastSeen' in value &&
    typeof value.lastSeen === 'number'
  ) {
    return { instanceId: value.instanceId, url: value.url, lastSeen: value.lastSeen }
  }
  return null
}
