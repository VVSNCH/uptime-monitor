import { Module } from '@nestjs/common'

import { QueueModule } from '../queue/queue.module.js'
import { RollupProcessor } from './rollup.processor.js'
import { RollupRepository } from './rollup.repository.js'
import { RollupScheduler } from './rollup.scheduler.js'

@Module({
  imports: [QueueModule],
  providers: [RollupRepository, RollupProcessor, RollupScheduler],
})
export class RollupModule {}
