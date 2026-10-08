import { Module } from '@nestjs/common'

import { MonitorsController } from './monitors.controller.js'
import { MonitorsRepository } from './monitors.repository.js'
import { MonitorsService } from './monitors.service.js'

@Module({
  controllers: [MonitorsController],
  providers: [MonitorsService, MonitorsRepository],
  exports: [MonitorsRepository],
})
export class MonitorsModule {}
