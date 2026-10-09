import { Inject, Injectable } from '@nestjs/common'
import type { HttpMethod } from '@uptime/shared'
import { fetch } from 'undici'

import { MAX_REDIRECTS, PROBE_USER_AGENT } from '../constants/index.js'
import { describeRequestError } from '../outbound/request-error.js'
import { UrlGuardService } from '../outbound/url-guard.service.js'

export interface ProbeTarget {
  url: string
  method: HttpMethod
  timeoutMs: number
  expectedStatus: number | null
}

export interface ProbeResult {
  ok: boolean
  statusCode: number | null
  responseMs: number | null
  error: string | null
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

@Injectable()
export class HttpProbeService {
  constructor(@Inject(UrlGuardService) private readonly guard: UrlGuardService) {}

  async probe(target: ProbeTarget): Promise<ProbeResult> {
    const startedAt = performance.now()
    const signal = AbortSignal.timeout(target.timeoutMs)
    let url = new URL(target.url)

    try {
      for (let redirects = 0; ; redirects++) {
        this.guard.assertUrlAllowed(url)

        const response = await fetch(url, {
          method: target.method,
          redirect: 'manual',
          signal,
          dispatcher: this.guard.dispatcher,
          headers: { 'user-agent': PROBE_USER_AGENT },
        })
        await response.body?.cancel()

        const location = response.headers.get('location')
        const isRedirect = REDIRECT_STATUSES.has(response.status) && location !== null
        if (isRedirect && response.status !== target.expectedStatus) {
          if (redirects >= MAX_REDIRECTS) {
            return failure(`Stopped after ${MAX_REDIRECTS} redirects`, response.status)
          }
          url = new URL(location, url)
          continue
        }

        const responseMs = Math.round(performance.now() - startedAt)
        const isOk = matchesExpected(response.status, target.expectedStatus)
        return {
          ok: isOk,
          statusCode: response.status,
          responseMs,
          error: isOk ? null : describeStatus(response.status, target.expectedStatus),
        }
      }
    } catch (error) {
      return failure(describeRequestError(error, target.timeoutMs), null)
    }
  }
}

function describeStatus(status: number, expected: number | null): string {
  return expected === null ? `HTTP ${status}` : `HTTP ${status}, expected ${expected}`
}

function matchesExpected(status: number, expected: number | null): boolean {
  return expected === null ? status >= 200 && status < 300 : status === expected
}

function failure(error: string, statusCode: number | null): ProbeResult {
  return { ok: false, statusCode, responseMs: null, error }
}
