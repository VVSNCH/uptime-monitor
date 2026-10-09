import { createPrismaClient, type PrismaClient } from '@uptime/database'
import type { PrismaService } from '@uptime/database/nest'

import { parseIsoDay } from './day.js'
import { RollupRepository } from './rollup.repository.js'

// Truncates tables, so it only runs against a database named *_test.
const testUrl = process.env.TEST_DATABASE_URL ?? ''
const isTestDatabase = testUrl !== '' && new URL(testUrl).pathname.endsWith('_test')
const describeWithDatabase = isTestDatabase ? describe : describe.skip

const DAY = parseIsoDay('2026-10-08')!

describeWithDatabase('RollupRepository against Postgres', () => {
  let prisma: PrismaClient
  let rollups: RollupRepository
  let payments: number
  let marketing: number
  let minute = 0

  // Each check gets its own occurrence so the unique key never collides.
  const check = (monitorId: number, checkedAt: string, ok: boolean | null, responseMs = 100) => ({
    monitorId,
    scheduledFor: new Date(Date.UTC(2026, 0, 1) + minute++ * 60_000),
    checkedAt: new Date(checkedAt),
    ok,
    responseMs: ok === null ? null : responseMs,
  })

  const statsFor = (monitorId: number) =>
    prisma.dailyStat.findMany({ where: { monitorId }, orderBy: { day: 'asc' } })

  beforeAll(() => {
    prisma = createPrismaClient(testUrl)
    rollups = new RollupRepository(prisma as unknown as PrismaService)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE users RESTART IDENTITY CASCADE`
    const user = await prisma.user.create({ data: { email: 'ada@example.com', passwordHash: 'x' } })
    const monitor = (name: string) =>
      prisma.monitor.create({
        data: { userId: user.id, name, url: 'https://example.com', intervalSeconds: 60 },
      })
    payments = (await monitor('Payments API')).id
    marketing = (await monitor('Marketing site')).id

    await prisma.check.createMany({
      data: [
        check(payments, '2026-10-08T00:00:00.000Z', true, 100),
        check(payments, '2026-10-08T12:00:00.000Z', true, 300),
        check(payments, '2026-10-08T23:59:59.999Z', false, 10_000),
        // A claim whose probe never finished has no outcome to count.
        check(payments, '2026-10-08T13:00:00.000Z', null),
        // Either side of the day belongs to another day.
        check(payments, '2026-10-07T23:59:59.999Z', false),
        check(payments, '2026-10-09T00:00:00.000Z', false),
        check(marketing, '2026-10-08T09:00:00.000Z', true, 50),
      ],
    })
  })

  describe('rollUp', () => {
    it('counts one UTC day per monitor, averaging only successful responses', async () => {
      expect(await rollups.rollUp(DAY)).toBe(2)

      const [payment] = await statsFor(payments)
      expect(payment).toMatchObject({ upCount: 2, downCount: 1, avgResponseMs: 200 })
      expect(payment?.day.toISOString()).toBe('2026-10-08T00:00:00.000Z')
      expect(await statsFor(marketing)).toMatchObject([
        { upCount: 1, downCount: 0, avgResponseMs: 50 },
      ])
    })

    it('gives the same counts when the same day is rolled up twice', async () => {
      await rollups.rollUp(DAY)
      await rollups.rollUp(DAY)

      expect(await statsFor(payments)).toMatchObject([{ upCount: 2, downCount: 1 }])
      expect(await prisma.dailyStat.count()).toBe(2)
    })

    it('picks up checks that arrived after the day was first rolled up', async () => {
      await rollups.rollUp(DAY)
      await prisma.check.create({ data: check(payments, '2026-10-08T23:00:00.000Z', false) })
      await rollups.rollUp(DAY)

      expect(await statsFor(payments)).toMatchObject([{ upCount: 2, downCount: 2 }])
    })

    it('leaves no average for a day with no successful check', async () => {
      await rollups.rollUp(parseIsoDay('2026-10-07')!)

      expect(await statsFor(payments)).toMatchObject([
        { upCount: 0, downCount: 1, avgResponseMs: null },
      ])
    })
  })

  describe('pruneChecksBefore', () => {
    it('deletes only checks older than the cutoff, across several batches', async () => {
      const pruned = await rollups.pruneChecksBefore(DAY, 1)

      expect(pruned).toBe(1)
      expect(await prisma.check.count()).toBe(6)
      expect(await prisma.check.count({ where: { checkedAt: { lt: DAY } } })).toBe(0)
    })

    it('keeps the rolled-up history', async () => {
      await rollups.rollUp(DAY)
      await rollups.pruneChecksBefore(parseIsoDay('2026-10-10')!, 2)

      expect(await prisma.check.count()).toBe(0)
      expect(await prisma.dailyStat.count()).toBe(2)
    })
  })
})
