import { Module } from '@nestjs/common'

import { QueueModule } from '../queue/queue.module.js'
import { MonitorScheduleService } from './monitor-schedule.service.js'
import { MonitorsController } from './monitors.controller.js'
import { MonitorsRepository } from './monitors.repository.js'
import { MonitorsService } from './monitors.service.js'

@Module({
  imports: [QueueModule],
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorsRepository, MonitorScheduleService],
  exports: [MonitorsRepository],
})
export class MonitorsModule {}
