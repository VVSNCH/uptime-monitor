import { AppException } from '@uptime/nest-common'
import { type CheckJob, ERROR_CODES, JOB_NAMES } from '@uptime/shared'
import type { Queue } from 'bullmq'

import { MonitorScheduleService, type SchedulableMonitor } from './monitor-schedule.service.js'
import type { MonitorsRepository } from './monitors.repository.js'

interface FakeScheduler {
  key: string
  every: number
  data: CheckJob | undefined
}

class FakeQueue {
  readonly schedulers = new Map<string, FakeScheduler>()
  readonly added: { name: string; data: CheckJob }[] = []
  upserts = 0
  isDown = false

  async upsertJobScheduler(
    key: string,
    { every }: { every: number },
    template?: { data?: CheckJob },
  ): Promise<void> {
    this.assertUp()
    this.upserts++
    this.schedulers.set(key, { key, every, data: template?.data })
  }

  async removeJobScheduler(key: string): Promise<boolean> {
    this.assertUp()
    return this.schedulers.delete(key)
  }

  async getJobSchedulers(): Promise<FakeScheduler[]> {
    this.assertUp()
    return [...this.schedulers.values()]
  }

  on(): void {}

  async add(name: string, data: CheckJob): Promise<void> {
    this.assertUp()
    this.added.push({ name, data })
  }

  private assertUp() {
    if (this.isDown) throw new Error('Connection is closed')
  }
}

function setup(active: SchedulableMonitor[] = []) {
  const queue = new FakeQueue()
  const repository = { listAllActive: async () => active }
  const schedule = new MonitorScheduleService(
    queue as unknown as Queue<CheckJob>,
    repository as unknown as MonitorsRepository,
  )
  return { queue, schedule }
}

const monitor = (id: number, intervalSeconds = 60, paused = false): SchedulableMonitor => ({
  id,
  intervalSeconds,
  paused,
})

describe('MonitorScheduleService', () => {
  describe('reconcile', () => {
    it('adds a schedule for every active monitor that has none', async () => {
      const { queue, schedule } = setup([monitor(1), monitor(2, 300)])

      expect(await schedule.reconcile()).toEqual({ added: 2, removed: 0 })
      expect(queue.schedulers.get('monitor-1')).toMatchObject({
        every: 60_000,
        data: { monitorId: 1 },
      })
      expect(queue.schedulers.get('monitor-2')).toMatchObject({ every: 300_000 })
    })

    it('removes schedules for monitors that no longer exist or are paused', async () => {
      const { queue, schedule } = setup([monitor(1)])
      queue.schedulers.set('monitor-1', { key: 'monitor-1', every: 60_000, data: { monitorId: 1 } })
      queue.schedulers.set('monitor-9', { key: 'monitor-9', every: 60_000, data: { monitorId: 9 } })

      expect(await schedule.reconcile()).toEqual({ added: 0, removed: 1 })
      expect([...queue.schedulers.keys()]).toEqual(['monitor-1'])
    })

    it('replaces a schedule whose interval no longer matches', async () => {
      const { queue, schedule } = setup([monitor(1, 900)])
      queue.schedulers.set('monitor-1', { key: 'monitor-1', every: 60_000, data: { monitorId: 1 } })

      expect(await schedule.reconcile()).toEqual({ added: 1, removed: 0 })
      expect(queue.schedulers.get('monitor-1')?.every).toBe(900_000)
    })

    it('leaves a correct schedule alone, so its next run is not disturbed', async () => {
      const { queue, schedule } = setup([monitor(1)])
      queue.schedulers.set('monitor-1', { key: 'monitor-1', every: 60_000, data: { monitorId: 1 } })

      await schedule.reconcile()

      expect(queue.upserts).toBe(0)
    })

    it('ignores schedules that do not belong to monitors', async () => {
      const { queue, schedule } = setup([])
      queue.schedulers.set('nightly-rollup', {
        key: 'nightly-rollup',
        every: 86_400_000,
        data: undefined,
      })

      await schedule.reconcile()

      expect(queue.schedulers.has('nightly-rollup')).toBe(true)
    })

    it('rebuilds everything after Redis has been wiped', async () => {
      const { queue, schedule } = setup([monitor(1), monitor(2), monitor(3)])
      await schedule.reconcile()

      queue.schedulers.clear()
      await schedule.reconcile()

      expect(queue.schedulers.size).toBe(3)
    })
  })

  describe('sync', () => {
    it('schedules an active monitor and unschedules a paused one', async () => {
      const { queue, schedule } = setup()

      await schedule.sync(monitor(1))
      expect(queue.schedulers.has('monitor-1')).toBe(true)

      await schedule.sync(monitor(1, 60, true))
      expect(queue.schedulers.has('monitor-1')).toBe(false)
    })

    it('does not fail the caller when Redis is down', async () => {
      const { queue, schedule } = setup()
      queue.isDown = true

      await expect(schedule.sync(monitor(1))).resolves.toBeUndefined()
      await expect(schedule.unschedule(1)).resolves.toBeUndefined()
    })
  })

  describe('runNow', () => {
    it('queues a check marked with when it was requested', async () => {
      const { queue, schedule } = setup()

      const before = Date.now()
      await schedule.runNow(4)

      expect(queue.added).toHaveLength(1)
      const [job] = queue.added
      expect(job?.name).toBe(JOB_NAMES.check)
      expect(job?.data.monitorId).toBe(4)
      expect(Date.parse(job?.data.requestedAt ?? '')).toBeGreaterThanOrEqual(before)
    })

    it('reports a 503 when the check cannot be queued', async () => {
      const { queue, schedule } = setup()
      queue.isDown = true

      const error: unknown = await schedule.runNow(4).catch((caught: unknown) => caught)

      expect(error).toBeInstanceOf(AppException)
      expect((error as AppException).toApiError()).toMatchObject({
        statusCode: 503,
        code: ERROR_CODES.serviceUnavailable,
      })
    })
  })
})
