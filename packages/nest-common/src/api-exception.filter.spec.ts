import { type ArgumentsHost, HttpStatus, NotFoundException } from '@nestjs/common'
import { type ApiError, ERROR_CODES } from '@uptime/shared'

import { ApiExceptionFilter } from './api-exception.filter.js'
import { AppException } from './app.exception.js'

interface CapturedResponse {
  statusCode: number
  headers: Record<string, string>
  body: ApiError | null
}

function handle(exception: unknown): CapturedResponse {
  const captured: CapturedResponse = { statusCode: 0, headers: {}, body: null }
  const response = {
    set statusCode(value: number) {
      captured.statusCode = value
    },
    setHeader: (name: string, value: string) => {
      captured.headers[name] = value
    },
    end: (chunk: string) => {
      captured.body = JSON.parse(chunk) as ApiError
    },
  }
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost

  new ApiExceptionFilter().catch(exception, host)
  return captured
}

describe('ApiExceptionFilter', () => {
  it('passes an AppException through with its own code', () => {
    const result = handle(
      new AppException(HttpStatus.CONFLICT, ERROR_CODES.emailTaken, 'Email already registered'),
    )

    expect(result.statusCode).toBe(409)
    expect(result.body).toEqual({
      statusCode: 409,
      code: ERROR_CODES.emailTaken,
      message: 'Email already registered',
    })
    expect(result.headers['Content-Type']).toBe('application/json')
  })

  it('maps a framework exception to the code for its status', () => {
    expect(handle(new NotFoundException('Cannot GET /nope')).body).toEqual({
      statusCode: 404,
      code: ERROR_CODES.notFound,
      message: 'Cannot GET /nope',
    })
  })

  it('hides the details of an unexpected error', () => {
    expect(handle(new Error('connection string with a password in it')).body).toEqual({
      statusCode: 500,
      code: ERROR_CODES.internal,
      message: 'Something went wrong',
    })
  })
})
