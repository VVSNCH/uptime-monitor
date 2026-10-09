import { createPrismaClient, type PrismaClient } from '@uptime/database'
import type { PrismaService } from '@uptime/database/nest'

import { IncidentsRepository } from './incidents.repository.js'

// Truncates tables, so it only runs against a database named *_test.
const testUrl = process.env.TEST_DATABASE_URL ?? ''
const isTestDatabase = testUrl !== '' && new URL(testUrl).pathname.endsWith('_test')
const describeWithDatabase = isTestDatabase ? describe : describe.skip

describeWithDatabase('IncidentsRepository against Postgres', () => {
  let prisma: PrismaClient
  let incidents: IncidentsRepository
  let alice: number
  let alicesMonitor: number
  let alicesOther: number

  const monitorFor = async (userId: number, name: string) =>
    (
      await prisma.monitor.create({
        data: { userId, name, url: 'https://example.com', intervalSeconds: 60 },
      })
    ).id

  beforeAll(() => {
    prisma = createPrismaClient(testUrl)
    incidents = new IncidentsRepository(prisma as unknown as PrismaService)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE users RESTART IDENTITY CASCADE`
    alice = (await prisma.user.create({ data: { email: 'alice@example.com', passwordHash: 'x' } }))
      .id
    const bob = (
      await prisma.user.create({ data: { email: 'bob@example.com', passwordHash: 'x' } })
    ).id
    alicesMonitor = await monitorFor(alice, 'Payments API')
    alicesOther = await monitorFor(alice, 'Marketing site')
    const bobsMonitor = await monitorFor(bob, 'Bob site')

    await prisma.incident.createMany({
      data: [
        {
          monitorId: alicesMonitor,
          startedAt: new Date('2026-10-01T10:00:00Z'),
          endedAt: new Date('2026-10-01T10:06:00Z'),
          cause: 'HTTP 502',
        },
        { monitorId: alicesOther, startedAt: new Date('2026-10-05T08:00:00Z'), cause: 'Timed out' },
        { monitorId: bobsMonitor, startedAt: new Date('2026-10-06T08:00:00Z'), cause: 'HTTP 500' },
      ],
    })
  })

  it('lists only the caller’s incidents, newest first, with the monitor name', async () => {
    const list = await incidents.listForUser(alice, { isOpenOnly: false, limit: 50 })

    expect(list.map((incident) => [incident.monitor.name, incident.cause])).toEqual([
      ['Marketing site', 'Timed out'],
      ['Payments API', 'HTTP 502'],
    ])
  })

  it('filters to open incidents', async () => {
    const list = await incidents.listForUser(alice, { isOpenOnly: true, limit: 50 })

    expect(list.map((incident) => incident.cause)).toEqual(['Timed out'])
  })

  it('filters to one monitor', async () => {
    const list = await incidents.listForUser(alice, {
      isOpenOnly: false,
      limit: 50,
      monitorId: alicesMonitor,
    })

    expect(list.map((incident) => incident.cause)).toEqual(['HTTP 502'])
  })

  it('respects the limit', async () => {
    expect(await incidents.listForUser(alice, { isOpenOnly: false, limit: 1 })).toHaveLength(1)
  })
})
