import type { ConfigService } from '@nestjs/config'
import { UnrecoverableError } from 'bullmq'

import type { Env } from '../config/env.js'
import { toIsoDay } from './day.js'
import { RollupProcessor } from './rollup.processor.js'
import type { RollupRepository } from './rollup.repository.js'

const NOW = new Date('2026-10-09T00:05:00.000Z')

class FakeRollups {
  readonly rolledUp: string[] = []
  readonly prunedBefore: Date[] = []

  async rollUp(day: Date): Promise<number> {
    this.rolledUp.push(toIsoDay(day))
    return 1
  }

  async pruneChecksBefore(cutoff: Date): Promise<number> {
    this.prunedBefore.push(cutoff)
    return 0
  }
}

function processorWith(rollups: FakeRollups): RollupProcessor {
  const config = { get: () => 30 } as unknown as ConfigService<Env, true>
  return new RollupProcessor(rollups as unknown as RollupRepository, config)
}

describe('RollupProcessor', () => {
  it('rolls up the last few full days on the nightly run', async () => {
    const rollups = new FakeRollups()

    const outcome = await processorWith(rollups).rollUp({}, NOW)

    expect(rollups.rolledUp).toEqual(['2026-10-06', '2026-10-07', '2026-10-08'])
    expect(outcome).toEqual({ days: rollups.rolledUp, monitorDays: 3 })
  })

  it('rolls up just the day it is given', async () => {
    const rollups = new FakeRollups()

    await processorWith(rollups).rollUp({ day: '2026-09-30' }, NOW)

    expect(rollups.rolledUp).toEqual(['2026-09-30'])
  })

  it('refuses a malformed day without retrying', async () => {
    await expect(processorWith(new FakeRollups()).rollUp({ day: '30/09' }, NOW)).rejects.toThrow(
      UnrecoverableError,
    )
  })

  it('prunes up to the start of the day the retention window begins', async () => {
    const rollups = new FakeRollups()

    await processorWith(rollups).prune(NOW)

    expect(rollups.prunedBefore.map((cutoff) => cutoff.toISOString())).toEqual([
      '2026-09-09T00:00:00.000Z',
    ])
  })
})
