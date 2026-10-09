import { createPrismaClient, type PrismaClient } from '@uptime/database'
import type { PrismaService } from '@uptime/database/nest'
import { AppException } from '@uptime/nest-common'
import { ERROR_CODES } from '@uptime/shared'

import { HistoryRepository } from '../history/history.repository.js'
import { MonitorsRepository } from '../monitors/monitors.repository.js'
import { StatsService } from './stats.service.js'

// Truncates tables, so it only runs against a database named *_test.
const testUrl = process.env.TEST_DATABASE_URL ?? ''
const isTestDatabase = testUrl !== '' && new URL(testUrl).pathname.endsWith('_test')
const describeWithDatabase = isTestDatabase ? describe : describe.skip

const HOUR = 3_600_000
const DAY = 24 * HOUR

describeWithDatabase('StatsService against Postgres', () => {
  let prisma: PrismaClient
  let stats: StatsService
  let alice: number
  let bob: number
  let monitorId: number
  let occurrence = 0

  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const isoDay = (date: Date) => date.toISOString().slice(0, 10)

  const addCheck = (checkedAt: Date, ok: boolean | null, responseMs = 100) =>
    prisma.check.create({
      data: {
        monitorId,
        scheduledFor: new Date(Date.UTC(2020, 0, 1) + occurrence++ * 60_000),
        checkedAt,
        ok,
        responseMs,
        statusCode: ok ? 200 : 502,
        error: ok === false ? 'HTTP 502' : null,
      },
    })

  beforeAll(() => {
    prisma = createPrismaClient(testUrl)
    const service = prisma as unknown as PrismaService
    stats = new StatsService(new MonitorsRepository(service), new HistoryRepository(service))
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE users RESTART IDENTITY CASCADE`
    alice = (await prisma.user.create({ data: { email: 'alice@example.com', passwordHash: 'x' } }))
      .id
    bob = (await prisma.user.create({ data: { email: 'bob@example.com', passwordHash: 'x' } })).id
    monitorId = (
      await prisma.monitor.create({
        data: {
          userId: alice,
          name: 'Payments API',
          url: 'https://example.com',
          intervalSeconds: 60,
        },
      })
    ).id
  })

  describe('stats', () => {
    it('combines rolled-up days with today read from raw checks', async () => {
      await prisma.dailyStat.create({
        data: {
          monitorId,
          day: new Date(today.getTime() - 2 * DAY),
          upCount: 6,
          downCount: 2,
          avgResponseMs: 300,
        },
      })
      await addCheck(new Date(today.getTime() + 1), true, 100)
      await addCheck(new Date(today.getTime() + 2), true, 100)
      // A claim still being probed does not count either way.
      await addCheck(new Date(today.getTime() + 3), null)

      const result = await stats.stats(alice, monitorId, '7d')

      expect(result.days).toHaveLength(7)
      expect(result.days.at(-1)).toEqual({
        day: isoDay(today),
        upCount: 2,
        downCount: 0,
        avgResponseMs: 100,
      })
      expect(result.days.at(-3)).toMatchObject({ upCount: 6, downCount: 2 })
      expect(result.days.at(-2)).toMatchObject({ upCount: 0, downCount: 0 })
      expect(result).toMatchObject({ uptime: 0.8, avgResponseMs: 250, checkCount: 10 })
    })

    it('reads a day the nightly rollup has not reached from raw checks', async () => {
      await addCheck(new Date(today.getTime() - DAY + HOUR), false)

      const result = await stats.stats(alice, monitorId, '7d')

      expect(result.days.at(-2)).toMatchObject({
        day: isoDay(new Date(today.getTime() - DAY)),
        downCount: 1,
      })
    })

    it('reads today from raw checks even if today was rolled up early', async () => {
      await prisma.dailyStat.create({
        data: { monitorId, day: today, upCount: 1, downCount: 0, avgResponseMs: 100 },
      })
      await addCheck(new Date(today.getTime() + 1), true)
      await addCheck(new Date(today.getTime() + 2), false)

      const result = await stats.stats(alice, monitorId, '7d')

      expect(result.days.at(-1)).toMatchObject({ upCount: 1, downCount: 1 })
    })

    it('reads the last 24 hours from raw checks, without daily entries', async () => {
      await addCheck(new Date(now.getTime() - HOUR), true, 200)
      await addCheck(new Date(now.getTime() - 2 * HOUR), false)
      await addCheck(new Date(now.getTime() - 25 * HOUR), false)

      expect(await stats.stats(alice, monitorId, '24h')).toMatchObject({
        uptime: 0.5,
        avgResponseMs: 200,
        checkCount: 2,
        days: [],
      })
    })

    it('has no uptime yet for a monitor that has never been checked', async () => {
      expect(await stats.stats(alice, monitorId, '30d')).toMatchObject({
        uptime: null,
        checkCount: 0,
      })
    })

    it('answers 404 for another user’s monitor', async () => {
      await expect(stats.stats(bob, monitorId, '24h')).rejects.toMatchObject({
        code: ERROR_CODES.notFound,
      })
    })
  })

  describe('checks', () => {
    it('lists finished checks in the range, oldest first', async () => {
      await addCheck(new Date(now.getTime() - HOUR), true)
      await addCheck(new Date(now.getTime() - 2 * HOUR), false)
      await addCheck(new Date(now.getTime() - 3 * HOUR), null)
      await addCheck(new Date(now.getTime() - 30 * HOUR), true)

      const list = await stats.checks(alice, monitorId, {})

      expect(list.map((check) => [check.ok, check.error])).toEqual([
        [false, 'HTTP 502'],
        [true, null],
      ])
      expect(typeof list[0]?.id).toBe('string')
    })

    it('refuses a range longer than a week', async () => {
      const error = await stats
        .checks(alice, monitorId, {
          from: new Date(now.getTime() - 8 * DAY).toISOString(),
          to: now.toISOString(),
        })
        .catch((caught: unknown) => caught)

      expect(error).toBeInstanceOf(AppException)
      expect((error as AppException).toApiError().message).toBe(
        'from and to can be at most 7 days apart',
      )
    })

    it('refuses a range that ends before it starts', async () => {
      await expect(
        stats.checks(alice, monitorId, {
          from: now.toISOString(),
          to: new Date(now.getTime() - HOUR).toISOString(),
        }),
      ).rejects.toThrow('from must be earlier than to')
    })

    it('answers 404 for another user’s monitor', async () => {
      await expect(stats.checks(bob, monitorId, {})).rejects.toMatchObject({
        code: ERROR_CODES.notFound,
      })
    })
  })
})
