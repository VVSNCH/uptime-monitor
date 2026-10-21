import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import type { ConfigService } from '@nestjs/config'
import type { PrismaService } from '@uptime/database/nest'
import type { RegistrationService } from '@uptime/service-registry/nest'

import type { Env } from '../config/env.js'
import { HeartbeatService } from './heartbeat.service.js'

describe('HeartbeatService', () => {
  let server: Server
  let url: string
  let pings = 0
  let status = 200

  beforeAll(async () => {
    server = createServer((_req, res) => {
      pings++
      res.writeHead(status).end()
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/ping`
  })

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  beforeEach(() => {
    pings = 0
    status = 200
  })

  function heartbeat(heartbeatUrl: string | undefined, isDatabaseUp = true, isRedisUp = true) {
    const config = { get: () => heartbeatUrl } as unknown as ConfigService<Env, true>
    const prisma = { isReachable: async () => isDatabaseUp } as unknown as PrismaService
    const registration = {
      isRedisReachable: async () => isRedisUp,
    } as unknown as RegistrationService
    return new HeartbeatService(config, prisma, registration)
  }

  it('pings the endpoint while the worker can do its job', async () => {
    expect(await heartbeat(url).beat()).toBe('sent')
    expect(pings).toBe(1)
  })

  it('goes quiet when the database or Redis is unreachable, so the outside service alerts', async () => {
    expect(await heartbeat(url, false).beat()).toBe('skipped')
    expect(await heartbeat(url, true, false).beat()).toBe('skipped')
    expect(pings).toBe(0)
  })

  it('reports an endpoint that refuses the ping', async () => {
    status = 404

    expect(await heartbeat(url).beat()).toBe('failed')
  })

  it('does nothing without a heartbeat URL', async () => {
    expect(await heartbeat(undefined).beat()).toBe('skipped')
  })
})
