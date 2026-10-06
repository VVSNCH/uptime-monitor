import type { Logger } from '@nestjs/common'
import { Redis } from 'ioredis'

const COMMAND_TIMEOUT_MS = 2_000

export function createRedis(url: string, logger: Logger): Redis {
  // Fail fast instead of queueing: a lookup that waits for Redis to come back
  // is a request that never gets routed.
  const redis = new Redis(url, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    commandTimeout: COMMAND_TIMEOUT_MS,
  })

  let state: 'connecting' | 'ready' | 'down' = 'connecting'
  redis.on('ready', () => {
    state = 'ready'
    logger.log('Connected to Redis')
  })
  redis.on('error', (error: Error) => {
    if (state === 'down') return
    state = 'down'
    logger.warn(`Redis unavailable: ${describeError(error)}`)
  })

  return redis
}

function describeError(error: Error): string {
  if (error.message) return error.message
  return 'code' in error && typeof error.code === 'string' ? error.code : error.name
}
