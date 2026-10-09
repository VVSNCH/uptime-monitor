import { Module } from '@nestjs/common'

import { NotifyModule } from '../notify/notify.module.js'
import { OutboundModule } from '../outbound/outbound.module.js'
import { QueueModule } from '../queue/queue.module.js'
import { CheckProcessor } from './check.processor.js'
import { CheckRepository } from './check.repository.js'
import { CheckRunner } from './check-runner.service.js'
import { HttpProbeService } from './http-probe.service.js'
import { StateMachineService } from './state-machine.service.js'

@Module({
  imports: [QueueModule, OutboundModule, NotifyModule],
  providers: [HttpProbeService, StateMachineService, CheckRepository, CheckRunner, CheckProcessor],
})
export class CheckModule {}
