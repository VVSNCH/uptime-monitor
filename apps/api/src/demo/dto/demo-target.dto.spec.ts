import 'reflect-metadata'

import { type AppException, createValidationPipe } from '@uptime/nest-common'

import { SetDemoTargetDto } from './demo-target.dto.js'

const pipe = createValidationPipe()
const metadata = { type: 'body' as const, metatype: SetDemoTargetDto }

async function messageFor(body: unknown): Promise<string | null> {
  try {
    await pipe.transform(body, metadata)
    return null
  } catch (error) {
    return (error as AppException).toApiError().message
  }
}

describe('SetDemoTargetDto', () => {
  it('accepts a mode on its own', async () => {
    expect(await messageFor({ mode: 'timeout' })).toBeNull()
  })

  it('needs a status code in the status mode, and says so once', async () => {
    expect(await messageFor({ mode: 'status' })).toBe(
      'statusCode must be a whole number from 200 to 599 when mode is status',
    )
  })

  it('refuses a status code a server could not send', async () => {
    expect(await messageFor({ mode: 'status', statusCode: 99 })).toMatch(/from 200 to 599/)
    expect(await messageFor({ mode: 'status', statusCode: 404 })).toBeNull()
  })

  it('refuses an unknown mode', async () => {
    expect(await messageFor({ mode: 'sideways' })).toBe(
      'mode must be one of up, down, timeout, status',
    )
  })
})
