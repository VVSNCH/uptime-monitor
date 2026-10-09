import { createPrismaClient, type PrismaClient } from '@uptime/database'
import type { PrismaService } from '@uptime/database/nest'
import { MONITOR_STATUS, TRANSITION } from '@uptime/shared'

import { CheckRepository } from './check.repository.js'
import { CheckRunner } from './check-runner.service.js'
import type { HttpProbeService, ProbeResult, ProbeTarget } from './http-probe.service.js'
import { StateMachineService } from './state-machine.service.js'

// The at-most-once guarantee and the status and incident bookkeeping rely on
// Postgres (a unique key, a row lock, a partial unique index), so they are
// tested against a real database. Truncates tables: *_test databases only.
const testUrl = process.env.TEST_DATABASE_URL ?? ''
const isTestDatabase = testUrl !== '' && new URL(testUrl).pathname.endsWith('_test')
const describeWithDatabase = isTestDatabase ? describe : describe.skip

const UP: ProbeResult = { ok: true, statusCode: 200, responseMs: 120, error: null }
const DOWN: ProbeResult = { ok: false, statusCode: 502, responseMs: 80, error: 'HTTP 502' }
const MINUTE = 60_000

class FakeProbe {
  readonly calls: ProbeTarget[] = []
  private readonly results: ProbeResult[]

  constructor(
    results: ProbeResult | ProbeResult[],
    private readonly delayMs = 0,
  ) {
    this.results = Array.isArray(results) ? [...results] : [results]
  }

  async probe(target: ProbeTarget): Promise<ProbeResult> {
    this.calls.push(target)
    await new Promise((resolve) => setTimeout(resolve, this.delayMs))
    const next = this.results.length > 1 ? this.results.shift() : this.results[0]
    if (!next) throw new Error('FakeProbe has no result to return')
    return next
  }
}

describeWithDatabase('CheckRunner against Postgres', () => {
  let prisma: PrismaClient
  let monitorId: number
  const start = new Date('2026-10-08T14:30:00.000Z')
  const occurrence = (n: number) => new Date(start.getTime() + n * MINUTE)

  const runnerWith = (probe: FakeProbe) =>
    new CheckRunner(
      new CheckRepository(prisma as unknown as PrismaService),
      probe as unknown as HttpProbeService,
      new StateMachineService(),
    )

  const monitor = () => prisma.monitor.findUniqueOrThrow({ where: { id: monitorId } })

  beforeAll(() => {
    prisma = createPrismaClient(testUrl)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE users RESTART IDENTITY CASCADE`
    const user = await prisma.user.create({ data: { email: 'ada@example.com', passwordHash: 'x' } })
    monitorId = (
      await prisma.monitor.create({
        data: {
          userId: user.id,
          name: 'Payments API',
          url: 'https://pay.example.com/health',
          intervalSeconds: 60,
        },
      })
    ).id
  })

  describe('recording', () => {
    it('probes the monitor and records the result', async () => {
      const probe = new FakeProbe(UP)

      const outcome = await runnerWith(probe).run(monitorId, occurrence(0))

      expect(outcome).toMatchObject({ status: 'recorded', result: UP })
      expect(probe.calls).toEqual([
        {
          url: 'https://pay.example.com/health',
          method: 'GET',
          timeoutMs: 10_000,
          expectedStatus: null,
        },
      ])
      const checks = await prisma.check.findMany()
      expect(checks).toHaveLength(1)
      expect(checks[0]).toMatchObject({ ok: true, statusCode: 200, responseMs: 120, error: null })
      expect(checks[0]?.scheduledFor).toEqual(occurrence(0))
    })

    it('updates when the monitor was last checked', async () => {
      await runnerWith(new FakeProbe(UP)).run(monitorId, occurrence(0))

      const current = await monitor()
      expect(current.lastCheckedAt).not.toBeNull()
      expect(current.lastResponseMs).toBe(120)
    })

    it('skips a paused monitor without probing', async () => {
      await prisma.monitor.update({ where: { id: monitorId }, data: { paused: true } })
      const probe = new FakeProbe(UP)

      expect(await runnerWith(probe).run(monitorId, occurrence(0))).toEqual({
        status: 'skipped',
        reason: 'paused',
      })
      expect(probe.calls).toHaveLength(0)
      expect(await prisma.check.count()).toBe(0)
    })

    it('skips a monitor that has been deleted', async () => {
      expect(await runnerWith(new FakeProbe(UP)).run(999_999, occurrence(0))).toEqual({
        status: 'skipped',
        reason: 'missing',
      })
    })
  })

  describe('at most once per occurrence', () => {
    it('checks a redelivered job only once', async () => {
      const probe = new FakeProbe(UP)
      const runner = runnerWith(probe)

      const first = await runner.run(monitorId, occurrence(0))
      const second = await runner.run(monitorId, occurrence(0))

      expect(first.status).toBe('recorded')
      expect(second).toEqual({ status: 'duplicate' })
      expect(probe.calls).toHaveLength(1)
      expect(await prisma.check.count()).toBe(1)
    })

    it('checks only once when two workers get the same job at the same moment', async () => {
      const probe = new FakeProbe(UP, 50)

      const outcomes = await Promise.all([
        runnerWith(probe).run(monitorId, occurrence(0)),
        runnerWith(probe).run(monitorId, occurrence(0)),
      ])

      expect(outcomes.map((outcome) => outcome.status).sort()).toEqual(['duplicate', 'recorded'])
      expect(probe.calls).toHaveLength(1)
      expect(await prisma.check.count()).toBe(1)
    })

    it('treats the next occurrence as a new check', async () => {
      const runner = runnerWith(new FakeProbe(UP))

      await runner.run(monitorId, occurrence(0))
      await runner.run(monitorId, occurrence(1))

      expect(await prisma.check.count()).toBe(2)
    })
  })

  describe('status and incidents', () => {
    it('moves a new monitor to UP on its first success, without an incident', async () => {
      const outcome = await runnerWith(new FakeProbe(UP)).run(monitorId, occurrence(0))

      expect(outcome).toMatchObject({ monitorStatus: MONITOR_STATUS.up, transition: null })
      expect((await monitor()).status).toBe(MONITOR_STATUS.up)
      expect(await prisma.incident.count()).toBe(0)
    })

    it('stays silent through a single failed check', async () => {
      const runner = runnerWith(new FakeProbe([UP, DOWN, UP]))

      await runner.run(monitorId, occurrence(0))
      const blip = await runner.run(monitorId, occurrence(1))
      await runner.run(monitorId, occurrence(2))

      expect(blip).toMatchObject({ monitorStatus: MONITOR_STATUS.up, transition: null })
      expect(await monitor()).toMatchObject({ status: MONITOR_STATUS.up, consecutiveFailures: 0 })
      expect(await prisma.incident.count()).toBe(0)
    })

    it('opens one incident on the second failure in a row, dated from the first', async () => {
      const runner = runnerWith(new FakeProbe([UP, DOWN, DOWN, DOWN]))

      await runner.run(monitorId, occurrence(0))
      await runner.run(monitorId, occurrence(1))
      const firstFailure = await prisma.check.findFirstOrThrow({ where: { ok: false } })
      const confirmed = await runner.run(monitorId, occurrence(2))
      const stillDown = await runner.run(monitorId, occurrence(3))

      expect(confirmed).toMatchObject({
        monitorStatus: MONITOR_STATUS.down,
        transition: TRANSITION.down,
      })
      expect(confirmed.status === 'recorded' && confirmed.incidentId).toBeGreaterThan(0)
      expect(stillDown).toMatchObject({ monitorStatus: MONITOR_STATUS.down, transition: null })

      const incidents = await prisma.incident.findMany()
      expect(incidents).toHaveLength(1)
      expect(incidents[0]).toMatchObject({ cause: 'HTTP 502', endedAt: null })
      expect(incidents[0]?.startedAt).toEqual(firstFailure.checkedAt)
    })

    it('closes the incident on the first success and returns to UP', async () => {
      const runner = runnerWith(new FakeProbe([DOWN, DOWN, UP]))

      await runner.run(monitorId, occurrence(0))
      await runner.run(monitorId, occurrence(1))
      const recovered = await runner.run(monitorId, occurrence(2))

      expect(recovered).toMatchObject({
        monitorStatus: MONITOR_STATUS.up,
        transition: TRANSITION.recovered,
      })
      const incident = await prisma.incident.findFirstOrThrow()
      expect(incident.endedAt).not.toBeNull()
      expect(incident.endedAt?.getTime()).toBeGreaterThanOrEqual(incident.startedAt.getTime())
      expect(await monitor()).toMatchObject({ status: MONITOR_STATUS.up, consecutiveFailures: 0 })
    })

    it('counts failures correctly when two checks of one monitor finish together', async () => {
      const probe = new FakeProbe(DOWN, 30)

      await Promise.all([
        runnerWith(probe).run(monitorId, occurrence(0)),
        runnerWith(probe).run(monitorId, occurrence(1)),
      ])

      expect(await monitor()).toMatchObject({ status: MONITOR_STATUS.down, consecutiveFailures: 2 })
      expect(await prisma.incident.count()).toBe(1)
    })
  })
})
