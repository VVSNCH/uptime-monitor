import { Module } from '@nestjs/common'

import { HistoryModule } from '../history/history.module.js'
import { MonitorsModule } from '../monitors/monitors.module.js'
import { StatsController } from './stats.controller.js'
import { StatsService } from './stats.service.js'

@Module({
  imports: [MonitorsModule, HistoryModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
