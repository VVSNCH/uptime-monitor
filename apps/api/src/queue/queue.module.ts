import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { QUEUE_NAMES } from '@uptime/shared'

import type { Env } from '../config/env.js'

// The api only produces jobs, and a request should get an answer rather than
// wait for Redis. Once connected, commands fail fast instead of queueing while
// Redis is away; before the first connection, callers bound the wait with a
// timeout. BullMQ is left to wait for "ready" itself, since its startup version
// check fails if sent before the connection is up.
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const url = config.get('REDIS_URL', { infer: true })
        return { connection: { url, enableOfflineQueue: false } }
      },
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.checks }, { name: QUEUE_NAMES.notifications }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
