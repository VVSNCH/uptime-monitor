import { createPrismaClient, type PrismaClient } from '@uptime/database'
import type { PrismaService } from '@uptime/database/nest'
import { CHANNEL_TYPE } from '@uptime/shared'

import { ChannelsRepository, type NewChannel } from './channels.repository.js'

// Truncates tables, so it only runs against a database named *_test.
const testUrl = process.env.TEST_DATABASE_URL ?? ''
const isTestDatabase = testUrl !== '' && new URL(testUrl).pathname.endsWith('_test')
const describeWithDatabase = isTestDatabase ? describe : describe.skip

const WEBHOOK: NewChannel = {
  type: CHANNEL_TYPE.webhook,
  target: 'https://hooks.example.com/abc',
  secret: 'whsec_x',
  sendOnDown: true,
  sendOnRecover: true,
}

describeWithDatabase('ChannelsRepository against Postgres', () => {
  let prisma: PrismaClient
  let channels: ChannelsRepository
  let alice: number
  let bob: number
  let bobsChannel: number

  beforeAll(() => {
    prisma = createPrismaClient(testUrl)
    channels = new ChannelsRepository(prisma as unknown as PrismaService)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE users RESTART IDENTITY CASCADE`
    alice = (await prisma.user.create({ data: { email: 'alice@example.com', passwordHash: 'x' } }))
      .id
    bob = (await prisma.user.create({ data: { email: 'bob@example.com', passwordHash: 'x' } })).id
    bobsChannel = (await channels.create(bob, WEBHOOK)).id
  })

  it('lists only the caller’s channels', async () => {
    await channels.create(alice, { ...WEBHOOK, type: CHANNEL_TYPE.email, target: 'a@example.com' })

    expect((await channels.listForUser(alice)).map((channel) => channel.target)).toEqual([
      'a@example.com',
    ])
  })

  it('cannot read, change or delete another user’s channel', async () => {
    expect(await channels.findForUser(alice, bobsChannel)).toBeNull()
    expect(await channels.updateForUser(alice, bobsChannel, { enabled: false })).toBeNull()
    expect(await channels.deleteForUser(alice, bobsChannel)).toBe(false)

    expect(await channels.findForUser(bob, bobsChannel)).toMatchObject({ enabled: true })
  })
})
