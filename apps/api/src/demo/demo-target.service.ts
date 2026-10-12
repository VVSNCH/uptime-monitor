import { Injectable } from '@nestjs/common'
import type { DemoTargetState, SetDemoTargetRequest } from '@uptime/shared'

const UP_STATUS = 200
const DOWN_STATUS = 503

// Held in memory: the demo runs one api instance, and a restart putting the
// target back to up is the safe default for a walkthrough.
@Injectable()
export class DemoTargetService {
  private state: DemoTargetState = { mode: 'up', statusCode: UP_STATUS }

  current(): DemoTargetState {
    return this.state
  }

  set(request: SetDemoTargetRequest): DemoTargetState {
    this.state = { mode: request.mode, statusCode: statusFor(request) }
    return this.state
  }
}

function statusFor({ mode, statusCode }: SetDemoTargetRequest): number | null {
  switch (mode) {
    case 'up':
      return UP_STATUS
    case 'down':
      return DOWN_STATUS
    case 'timeout':
      return null
    case 'status':
      return statusCode ?? DOWN_STATUS
  }
}
