import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { QUEUE_NAMES } from '@uptime/shared'

import type { Env } from '../config/env.js'

// A consuming connection must keep retrying through a Redis outage rather than
// fail its commands, which is what maxRetriesPerRequest: null tells BullMQ.
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const url = config.get('REDIS_URL', { infer: true })
        return { connection: { url, maxRetriesPerRequest: null } }
      },
    }),
    BullModule.registerQueue({ name: QUEUE_NAMES.checks }, { name: QUEUE_NAMES.notifications }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
