import { Module } from '@nestjs/common'

import { QueueModule } from '../queue/queue.module.js'
import { ChannelTester } from './channel-tester.service.js'
import { ChannelsController } from './channels.controller.js'
import { ChannelsRepository } from './channels.repository.js'
import { ChannelsService } from './channels.service.js'

@Module({
  imports: [QueueModule],
  controllers: [ChannelsController],
  providers: [ChannelsService, ChannelsRepository, ChannelTester],
})
export class ChannelsModule {}
