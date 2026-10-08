import { createPrismaClient, type PrismaClient } from '@uptime/database'
import type { PrismaService } from '@uptime/database/nest'

import { type MonitorFields, MonitorsRepository } from './monitors.repository.js'

// Runs against a real database because ownership bugs live in the queries
// themselves. Truncates tables, so it only runs against a database named *_test.
const testUrl = process.env.TEST_DATABASE_URL ?? ''
const isTestDatabase = testUrl !== '' && new URL(testUrl).pathname.endsWith('_test')
const describeWithDatabase = isTestDatabase ? describe : describe.skip

const FIELDS: MonitorFields = {
  name: 'Payments API',
  url: 'https://pay.example.com/health',
  method: 'GET',
  intervalSeconds: 60,
  timeoutMs: 10_000,
  expectedStatus: null,
  failureThreshold: 2,
}

describeWithDatabase('MonitorsRepository against Postgres', () => {
  let prisma: PrismaClient
  let monitors: MonitorsRepository
  let alice: number
  let bob: number
  let bobsMonitor: number

  beforeAll(() => {
    prisma = createPrismaClient(testUrl)
    monitors = new MonitorsRepository(prisma as unknown as PrismaService)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE users RESTART IDENTITY CASCADE`
    alice = (await prisma.user.create({ data: { email: 'alice@example.com', passwordHash: 'x' } }))
      .id
    bob = (await prisma.user.create({ data: { email: 'bob@example.com', passwordHash: 'x' } })).id
    bobsMonitor = (await monitors.create(bob, FIELDS)).id
  })

  it('lists only the caller’s own monitors', async () => {
    await monitors.create(alice, { ...FIELDS, name: 'Alice site' })

    const list = await monitors.listForUser(alice)

    expect(list.map((monitor) => monitor.name)).toEqual(['Alice site'])
  })

  it('cannot read another user’s monitor', async () => {
    expect(await monitors.findForUser(alice, bobsMonitor)).toBeNull()
    expect(await monitors.findForUser(bob, bobsMonitor)).not.toBeNull()
  })

  it('cannot update another user’s monitor', async () => {
    expect(await monitors.updateForUser(alice, bobsMonitor, { name: 'hijacked' })).toBeNull()
    expect((await monitors.findForUser(bob, bobsMonitor))?.name).toBe(FIELDS.name)
  })

  it('cannot pause another user’s monitor', async () => {
    expect(await monitors.updateForUser(alice, bobsMonitor, { paused: true })).toBeNull()
    expect((await monitors.findForUser(bob, bobsMonitor))?.paused).toBe(false)
  })

  it('cannot delete another user’s monitor', async () => {
    expect(await monitors.deleteForUser(alice, bobsMonitor)).toBe(false)
    expect(await monitors.findForUser(bob, bobsMonitor)).not.toBeNull()
  })

  it('reports a missing id the same way as someone else’s', async () => {
    expect(await monitors.findForUser(bob, 999_999)).toBeNull()
    expect(await monitors.updateForUser(bob, 999_999, { name: 'x' })).toBeNull()
    expect(await monitors.deleteForUser(bob, 999_999)).toBe(false)
  })

  it('deletes a monitor’s checks and incidents with it', async () => {
    await prisma.check.create({
      data: { monitorId: bobsMonitor, scheduledFor: new Date(), ok: true },
    })
    await prisma.incident.create({
      data: { monitorId: bobsMonitor, startedAt: new Date(), cause: 'HTTP 500' },
    })

    expect(await monitors.deleteForUser(bob, bobsMonitor)).toBe(true)
    expect(await prisma.check.count()).toBe(0)
    expect(await prisma.incident.count()).toBe(0)
  })
})
