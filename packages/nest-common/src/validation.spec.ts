import 'reflect-metadata'

import { ERROR_CODES } from '@uptime/shared'
import { Type } from 'class-transformer'
import { IsEmail, IsInt, Min, ValidateNested } from 'class-validator'

import { AppException } from './app.exception.js'
import { createValidationPipe } from './validation.js'

class Limits {
  @IsInt()
  @Min(1)
  retries!: number
}

class SampleBody {
  @IsEmail()
  email!: string

  @ValidateNested()
  @Type(() => Limits)
  limits!: Limits
}

const metadata = { type: 'body' as const, metatype: SampleBody }

describe('createValidationPipe', () => {
  const pipe = createValidationPipe()

  it('strips fields the request type does not declare', async () => {
    const result: unknown = await pipe.transform(
      { email: 'a@example.com', limits: { retries: 2 }, isAdmin: true },
      metadata,
    )

    expect(result).toBeInstanceOf(SampleBody)
    expect(result).not.toHaveProperty('isAdmin')
  })

  it('rejects an invalid body with every message, including nested ones', async () => {
    const error: unknown = await pipe
      .transform({ email: 'not-an-email', limits: { retries: 0 } }, metadata)
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(AppException)
    expect((error as AppException).toApiError()).toEqual({
      statusCode: 400,
      code: ERROR_CODES.validationFailed,
      message: 'email must be an email; retries must not be less than 1',
    })
  })
})
