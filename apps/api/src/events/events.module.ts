import { Module } from '@nestjs/common'

import { EventsController } from './events.controller.js'
import { LiveEventsService } from './live-events.service.js'

@Module({
  controllers: [EventsController],
  providers: [LiveEventsService],
})
export class EventsModule {}
