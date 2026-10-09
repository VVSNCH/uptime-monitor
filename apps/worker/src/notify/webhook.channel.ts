import { createHmac } from 'node:crypto'

import { Inject, Injectable } from '@nestjs/common'
import { type ChannelTestResult, WEBHOOK_HEADERS } from '@uptime/shared'
import { fetch } from 'undici'

import { PROBE_USER_AGENT, WEBHOOK_TIMEOUT_MS } from '../constants/index.js'
import { describeRequestError } from '../outbound/request-error.js'
import { UrlGuardService } from '../outbound/url-guard.service.js'
import type { Message } from './message.js'

const MS_PER_SECOND = 1_000

// The signature covers the timestamp as well as the body, so a captured
// delivery cannot be replayed later with a fresh timestamp.
export function signWebhook(secret: string, timestamp: string, body: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`
}

// A webhook URL is typed by a user just like a monitor URL, so it goes through
// the same guard. Redirects are not followed: a receiver that redirects is
// misconfigured, and following it would be a way round the guard.
@Injectable()
export class WebhookChannel {
  constructor(@Inject(UrlGuardService) private readonly guard: UrlGuardService) {}

  async send(target: string, secret: string, message: Message): Promise<ChannelTestResult> {
    const body = JSON.stringify(message.payload)
    const timestamp = Math.floor(Date.now() / MS_PER_SECOND).toString()

    try {
      const url = new URL(target)
      this.guard.assertUrlAllowed(url)
      const response = await fetch(url, {
        method: 'POST',
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        dispatcher: this.guard.dispatcher,
        headers: {
          'content-type': 'application/json',
          'user-agent': PROBE_USER_AGENT,
          [WEBHOOK_HEADERS.event]: message.event,
          [WEBHOOK_HEADERS.timestamp]: timestamp,
          [WEBHOOK_HEADERS.signature]: signWebhook(secret, timestamp, body),
        },
      })
      await response.body?.cancel()

      return response.ok
        ? { delivered: true, statusCode: response.status, error: null }
        : {
            delivered: false,
            statusCode: response.status,
            error: `The receiver answered HTTP ${response.status}`,
          }
    } catch (error) {
      return {
        delivered: false,
        statusCode: null,
        error: describeRequestError(error, WEBHOOK_TIMEOUT_MS),
      }
    }
  }
}
