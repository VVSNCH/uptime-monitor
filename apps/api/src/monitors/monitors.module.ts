import { Module } from '@nestjs/common'

import { HistoryModule } from '../history/history.module.js'
import { QueueModule } from '../queue/queue.module.js'
import { MonitorScheduleService } from './monitor-schedule.service.js'
import { MonitorsController } from './monitors.controller.js'
import { MonitorsRepository } from './monitors.repository.js'
import { MonitorsService } from './monitors.service.js'

@Module({
  imports: [QueueModule, HistoryModule],
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorsRepository, MonitorScheduleService],
  exports: [MonitorsRepository],
})
export class MonitorsModule {}
