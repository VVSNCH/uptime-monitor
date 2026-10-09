import { MONITOR_STATUS, TRANSITION } from '@uptime/shared'

import { type MonitorState, StateMachineService } from './state-machine.service.js'

describe('StateMachineService', () => {
  const machine = new StateMachineService()

  const state = (overrides: Partial<MonitorState>): MonitorState => ({
    status: MONITOR_STATUS.up,
    consecutiveFailures: 0,
    failureThreshold: 2,
    ...overrides,
  })

  it('stays up and counts a single failure without a transition', () => {
    expect(machine.evaluate(state({}), false)).toEqual({
      status: MONITOR_STATUS.up,
      consecutiveFailures: 1,
      transition: null,
    })
  })

  it('suppresses a blip: one failure then a success produces no transition at all', () => {
    const afterFailure = machine.evaluate(state({}), false)
    const afterRecovery = machine.evaluate(state(afterFailure), true)

    expect(afterFailure.transition).toBeNull()
    expect(afterRecovery).toEqual({
      status: MONITOR_STATUS.up,
      consecutiveFailures: 0,
      transition: null,
    })
  })

  it('goes down when failures reach the threshold', () => {
    expect(machine.evaluate(state({ consecutiveFailures: 1 }), false)).toEqual({
      status: MONITOR_STATUS.down,
      consecutiveFailures: 2,
      transition: TRANSITION.down,
    })
  })

  it('goes down on the first failure when the threshold is one', () => {
    expect(machine.evaluate(state({ failureThreshold: 1 }), false).transition).toBe(TRANSITION.down)
  })

  it('does not transition again on repeated failures while down', () => {
    expect(
      machine.evaluate(state({ status: MONITOR_STATUS.down, consecutiveFailures: 5 }), false),
    ).toEqual({ status: MONITOR_STATUS.down, consecutiveFailures: 6, transition: null })
  })

  it('recovers on the first success while down', () => {
    expect(
      machine.evaluate(state({ status: MONITOR_STATUS.down, consecutiveFailures: 3 }), true),
    ).toEqual({
      status: MONITOR_STATUS.up,
      consecutiveFailures: 0,
      transition: TRANSITION.recovered,
    })
  })

  it('moves a pending monitor to up on success without a transition', () => {
    expect(machine.evaluate(state({ status: MONITOR_STATUS.pending }), true)).toEqual({
      status: MONITOR_STATUS.up,
      consecutiveFailures: 0,
      transition: null,
    })
  })

  it('keeps a pending monitor pending until failures reach the threshold', () => {
    const first = machine.evaluate(state({ status: MONITOR_STATUS.pending }), false)
    const second = machine.evaluate(state(first), false)

    expect(first).toEqual({
      status: MONITOR_STATUS.pending,
      consecutiveFailures: 1,
      transition: null,
    })
    expect(second).toEqual({
      status: MONITOR_STATUS.down,
      consecutiveFailures: 2,
      transition: TRANSITION.down,
    })
  })

  it('leaves a paused monitor untouched', () => {
    expect(machine.evaluate(state({ status: MONITOR_STATUS.paused }), false)).toEqual({
      status: MONITOR_STATUS.paused,
      consecutiveFailures: 0,
      transition: null,
    })
  })
})
