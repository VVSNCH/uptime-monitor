import 'reflect-metadata'

import { AppException, createValidationPipe } from '@uptime/nest-common'
import { ERROR_CODES } from '@uptime/shared'

import { CreateChannelDto } from './channel.dto.js'

const pipe = createValidationPipe()
const metadata = { type: 'body' as const, metatype: CreateChannelDto }

async function messageFor(body: unknown): Promise<string | null> {
  try {
    await pipe.transform(body, metadata)
    return null
  } catch (error) {
    expect(error).toBeInstanceOf(AppException)
    const apiError = (error as AppException).toApiError()
    expect(apiError.code).toBe(ERROR_CODES.validationFailed)
    return apiError.message
  }
}

describe('CreateChannelDto', () => {
  it('accepts an email channel with an email address', async () => {
    expect(await messageFor({ type: 'EMAIL', target: 'ops@example.com' })).toBeNull()
  })

  it('accepts a webhook channel with an https URL', async () => {
    expect(await messageFor({ type: 'WEBHOOK', target: 'https://hooks.slack.com/x' })).toBeNull()
  })

  it('rejects a webhook channel whose target is not a URL', async () => {
    expect(await messageFor({ type: 'WEBHOOK', target: 'not a url' })).toBe(
      'target must be a full http:// or https:// address for a webhook channel',
    )
  })

  it('rejects an email channel whose target is a URL', async () => {
    expect(await messageFor({ type: 'EMAIL', target: 'https://example.com' })).toBe(
      'target must be an email address for an email channel',
    )
  })

  it('rejects an unknown type', async () => {
    expect(await messageFor({ type: 'SMS', target: '+15550100' })).toContain(
      'type must be one of EMAIL, WEBHOOK',
    )
  })
})
