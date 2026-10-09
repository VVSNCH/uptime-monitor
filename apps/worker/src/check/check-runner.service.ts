import { Inject, Injectable } from '@nestjs/common'
import { HTTP_METHODS, type HttpMethod, type MonitorStatus, type Transition } from '@uptime/shared'

import { CheckRepository } from './check.repository.js'
import { HttpProbeService, type ProbeResult } from './http-probe.service.js'
import { StateMachineService } from './state-machine.service.js'

export type CheckOutcome =
  | { status: 'skipped'; reason: 'missing' | 'paused' }
  | { status: 'duplicate' }
  | {
      status: 'recorded'
      result: ProbeResult
      monitorStatus: MonitorStatus
      transition: Transition | null
      incidentId: number | null
    }

@Injectable()
export class CheckRunner {
  constructor(
    @Inject(CheckRepository) private readonly checks: CheckRepository,
    @Inject(HttpProbeService) private readonly probe: HttpProbeService,
    @Inject(StateMachineService) private readonly stateMachine: StateMachineService,
  ) {}

  async run(monitorId: number, scheduledFor: Date): Promise<CheckOutcome> {
    const monitor = await this.checks.findMonitor(monitorId)
    if (!monitor) return { status: 'skipped', reason: 'missing' }
    if (monitor.paused) return { status: 'skipped', reason: 'paused' }

    const isClaimed = await this.checks.claim(monitor.id, scheduledFor)
    if (!isClaimed) return { status: 'duplicate' }

    const result = await this.probe.probe({
      url: monitor.url,
      method: asHttpMethod(monitor.method),
      timeoutMs: monitor.timeoutMs,
      expectedStatus: monitor.expectedStatus,
    })

    const recorded = await this.checks.record(monitor.id, scheduledFor, result, (state) =>
      this.stateMachine.evaluate(state, result.ok),
    )
    if (!recorded) return { status: 'skipped', reason: 'missing' }

    return {
      status: 'recorded',
      result,
      monitorStatus: recorded.evaluation.status,
      transition: recorded.evaluation.transition,
      incidentId: recorded.incidentId,
    }
  }
}

function asHttpMethod(value: string): HttpMethod {
  return HTTP_METHODS.find((method) => method === value) ?? 'GET'
}
