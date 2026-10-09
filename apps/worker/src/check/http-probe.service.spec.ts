import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { ConfigService } from '@nestjs/config'

import { BlockedUrlError, UrlGuardService } from '../outbound/url-guard.service.js'
import { HttpProbeService, type ProbeTarget } from './http-probe.service.js'

class LoopbackGuard extends UrlGuardService {
  constructor() {
    super(new ConfigService({ ALLOW_PRIVATE_TARGETS: true }))
  }

  override assertUrlAllowed(url: URL): void {
    if (url.pathname.startsWith('/internal')) {
      throw new BlockedUrlError('internal is a private or reserved address')
    }
    super.assertUrlAllowed(url)
  }
}

describe('HttpProbeService', () => {
  let server: Server
  let baseUrl: string
  let guard: UrlGuardService
  let probe: HttpProbeService

  const target = (path: string, overrides: Partial<ProbeTarget> = {}): ProbeTarget => ({
    url: `${baseUrl}${path}`,
    method: 'GET',
    timeoutMs: 2_000,
    expectedStatus: null,
    ...overrides,
  })

  beforeAll(async () => {
    server = createServer((req, res) => {
      const redirect = (location: string) => res.writeHead(302, { location }).end()
      switch (req.url) {
        case '/ok':
          return res.writeHead(200).end('fine')
        case '/error':
          return res.writeHead(500).end()
        case '/unauthorized':
          return res.writeHead(401).end()
        case '/slow':
          return setTimeout(() => res.writeHead(200).end(), 500)
        case '/redirect':
          return redirect('/ok')
        case '/loop':
          return redirect('/loop')
        case '/to-internal':
          return redirect('/internal/metadata')
        default:
          return res.writeHead(404).end()
      }
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    guard = new LoopbackGuard()
    probe = new HttpProbeService(guard)
  })

  afterAll(async () => {
    await guard.dispatcher.close()
    await new Promise((resolve) => server.close(resolve))
  })

  it('records a 2xx as up, with status and response time', async () => {
    const result = await probe.probe(target('/ok'))

    expect(result).toMatchObject({ ok: true, statusCode: 200, error: null })
    expect(result.responseMs).toEqual(expect.any(Number))
  })

  it('records a 5xx as a failure with its status', async () => {
    expect(await probe.probe(target('/error'))).toMatchObject({
      ok: false,
      statusCode: 500,
      error: 'HTTP 500',
    })
  })

  it('says which status was expected when a specific one was set', async () => {
    expect(await probe.probe(target('/ok', { expectedStatus: 401 }))).toMatchObject({
      ok: false,
      statusCode: 200,
      error: 'HTTP 200, expected 401',
    })
  })

  it('accepts a non-2xx status when it is the expected one', async () => {
    expect(await probe.probe(target('/unauthorized', { expectedStatus: 401 }))).toMatchObject({
      ok: true,
      statusCode: 401,
    })
  })

  it('records a request slower than the timeout as a failure', async () => {
    expect(await probe.probe(target('/slow', { timeoutMs: 100 }))).toEqual({
      ok: false,
      statusCode: null,
      responseMs: null,
      error: 'Timed out after 100 ms',
    })
  })

  it('follows a redirect to its destination', async () => {
    expect(await probe.probe(target('/redirect'))).toMatchObject({ ok: true, statusCode: 200 })
  })

  it('does not follow a redirect when the redirect itself is expected', async () => {
    expect(await probe.probe(target('/redirect', { expectedStatus: 302 }))).toMatchObject({
      ok: true,
      statusCode: 302,
    })
  })

  it('gives up on a redirect loop', async () => {
    expect(await probe.probe(target('/loop'))).toMatchObject({
      ok: false,
      statusCode: 302,
      error: 'Stopped after 5 redirects',
    })
  })

  it('checks every redirect hop, so a public URL cannot bounce to a private one', async () => {
    expect(await probe.probe(target('/to-internal'))).toMatchObject({
      ok: false,
      statusCode: null,
      error: 'internal is a private or reserved address',
    })
  })

  it('refuses a private target outright when private targets are not allowed', async () => {
    const strictGuard = new UrlGuardService(new ConfigService({ ALLOW_PRIVATE_TARGETS: false }))
    const strictProbe = new HttpProbeService(strictGuard)

    const result = await strictProbe.probe(target('/ok'))
    await strictGuard.dispatcher.close()

    expect(result).toMatchObject({ ok: false, error: '127.0.0.1 is a private or reserved address' })
  })

  it('reports a refused connection plainly', async () => {
    const closed = createServer()
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve))
    const { port } = closed.address() as AddressInfo
    await new Promise((resolve) => closed.close(resolve))

    const result = await probe.probe({ ...target('/ok'), url: `http://127.0.0.1:${port}/` })

    expect(result).toMatchObject({ ok: false, statusCode: null, error: 'Connection refused' })
  })
})
