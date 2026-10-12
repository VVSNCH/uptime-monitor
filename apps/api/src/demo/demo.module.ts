import { Module } from '@nestjs/common'

import { DemoController } from './demo.controller.js'
import { DemoTargetService } from './demo-target.service.js'

@Module({
  controllers: [DemoController],
  providers: [DemoTargetService],
})
export class DemoModule {}
