import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { ConfigService } from '@nestjs/config'
import { WEBHOOK_EVENTS, WEBHOOK_HEADERS } from '@uptime/shared'

import { UrlGuardService } from '../outbound/url-guard.service.js'
import { buildTestMessage } from './message.js'
import { signWebhook, WebhookChannel } from './webhook.channel.js'

const SECRET = 'whsec_test_secret'

interface Received {
  headers: IncomingHttpHeaders
  body: string
}

// What a receiver would do: recompute the signature from the raw body and the
// timestamp header, and compare in constant time.
function isAuthentic({ headers, body }: Received): boolean {
  const timestamp = String(headers[WEBHOOK_HEADERS.timestamp])
  const expected = `sha256=${createHmac('sha256', SECRET).update(`${timestamp}.${body}`).digest('hex')}`
  const actual = String(headers[WEBHOOK_HEADERS.signature])
  return (
    actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
}

describe('WebhookChannel', () => {
  let server: Server
  let baseUrl: string
  let received: Received[]
  let guard: UrlGuardService
  let webhooks: WebhookChannel

  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = ''
      req.on('data', (chunk: Buffer) => (body += chunk.toString()))
      req.on('end', () => {
        received.push({ headers: req.headers, body })
        if (req.url === '/fails') return res.writeHead(500).end()
        if (req.url === '/redirects') return res.writeHead(302, { location: '/ok' }).end()
        res.writeHead(200).end('ok')
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    guard = new UrlGuardService(new ConfigService({ ALLOW_PRIVATE_TARGETS: true }))
    webhooks = new WebhookChannel(guard)
  })

  beforeEach(() => {
    received = []
  })

  afterAll(async () => {
    await guard.dispatcher.close()
    await new Promise((resolve) => server.close(resolve))
  })

  it('posts the message as JSON with a signature the receiver can verify', async () => {
    const result = await webhooks.send(`${baseUrl}/ok`, SECRET, buildTestMessage(new Date()))

    expect(result).toEqual({ delivered: true, statusCode: 200, error: null })
    expect(received).toHaveLength(1)
    const [request] = received
    if (!request) throw new Error('nothing received')
    expect(request.headers['content-type']).toBe('application/json')
    expect(request.headers[WEBHOOK_HEADERS.event]).toBe(WEBHOOK_EVENTS.test)
    expect(isAuthentic(request)).toBe(true)
    expect(JSON.parse(request.body)).toMatchObject({ event: WEBHOOK_EVENTS.test })
  })

  it('produces a signature that fails if the body is changed', () => {
    const signature = signWebhook(SECRET, '1700000000', '{"a":1}')

    expect(signWebhook(SECRET, '1700000000', '{"a":2}')).not.toBe(signature)
    expect(signWebhook(SECRET, '1700000001', '{"a":1}')).not.toBe(signature)
  })

  it('reports a receiver error with its status', async () => {
    expect(await webhooks.send(`${baseUrl}/fails`, SECRET, buildTestMessage(new Date()))).toEqual({
      delivered: false,
      statusCode: 500,
      error: 'The receiver answered HTTP 500',
    })
  })

  it('does not follow redirects', async () => {
    const result = await webhooks.send(`${baseUrl}/redirects`, SECRET, buildTestMessage(new Date()))

    expect(result).toMatchObject({ delivered: false, statusCode: 302 })
    expect(received).toHaveLength(1)
  })

  it('refuses a private address unless private targets are allowed', async () => {
    const strictGuard = new UrlGuardService(new ConfigService({ ALLOW_PRIVATE_TARGETS: false }))
    const strict = new WebhookChannel(strictGuard)

    const result = await strict.send(`${baseUrl}/ok`, SECRET, buildTestMessage(new Date()))
    await strictGuard.dispatcher.close()

    expect(result).toMatchObject({
      delivered: false,
      error: '127.0.0.1 is a private or reserved address',
    })
    expect(received).toHaveLength(0)
  })
})
