import { Module } from '@nestjs/common'

import { MonitorsModule } from '../monitors/monitors.module.js'
import { IncidentsController } from './incidents.controller.js'
import { IncidentsRepository } from './incidents.repository.js'
import { IncidentsService } from './incidents.service.js'

@Module({
  imports: [MonitorsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, IncidentsRepository],
})
export class IncidentsModule {}
