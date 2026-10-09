import { Injectable } from '@nestjs/common'
import { MONITOR_STATUS, type MonitorStatus, TRANSITION, type Transition } from '@uptime/shared'

export interface MonitorState {
  status: MonitorStatus
  consecutiveFailures: number
  failureThreshold: number
}

export interface Evaluation {
  status: MonitorStatus
  consecutiveFailures: number
  transition: Transition | null
}

@Injectable()
export class StateMachineService {
  evaluate(state: MonitorState, isCheckOk: boolean): Evaluation {
    if (state.status === MONITOR_STATUS.paused) {
      return {
        status: state.status,
        consecutiveFailures: state.consecutiveFailures,
        transition: null,
      }
    }

    // Recovery is not debounced: a service that answers is answering.
    if (isCheckOk) {
      return {
        status: MONITOR_STATUS.up,
        consecutiveFailures: 0,
        transition: state.status === MONITOR_STATUS.down ? TRANSITION.recovered : null,
      }
    }

    const consecutiveFailures = state.consecutiveFailures + 1

    if (state.status === MONITOR_STATUS.down) {
      return { status: MONITOR_STATUS.down, consecutiveFailures, transition: null }
    }

    if (consecutiveFailures >= state.failureThreshold) {
      return { status: MONITOR_STATUS.down, consecutiveFailures, transition: TRANSITION.down }
    }

    return { status: state.status, consecutiveFailures, transition: null }
  }
}
