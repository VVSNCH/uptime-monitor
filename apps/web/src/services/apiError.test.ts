import { ERROR_CODES } from '@uptime/shared'
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'

import { CLIENT_ERROR_CODES } from '../constants/api'
import { ApiRequestError, toApiRequestError } from './apiError'

function responseError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() }
  const response: AxiosResponse = { status, statusText: '', data, headers: {}, config }
  return new AxiosError('Request failed', AxiosError.ERR_BAD_RESPONSE, config, null, response)
}

describe('toApiRequestError', () => {
  it('keeps the code and message from an api error body', () => {
    const error = toApiRequestError(
      responseError(409, {
        statusCode: 409,
        code: ERROR_CODES.emailTaken,
        message: 'An account with this email already exists',
      }),
    )

    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error).toMatchObject({
      statusCode: 409,
      code: ERROR_CODES.emailTaken,
      message: 'An account with this email already exists',
      isClientError: true,
    })
  })

  it('falls back to the status when the body is not an api error', () => {
    expect(toApiRequestError(responseError(503, { status: 'degraded' }))).toMatchObject({
      statusCode: 503,
      code: CLIENT_ERROR_CODES.unknown,
      isClientError: false,
    })
  })

  it('reports a request that never got a response as a network error', () => {
    const error = new AxiosError('Network Error', AxiosError.ERR_NETWORK)

    expect(toApiRequestError(error)).toMatchObject({
      statusCode: null,
      code: CLIENT_ERROR_CODES.network,
    })
  })

  it('reports a timeout separately from other network errors', () => {
    const error = new AxiosError('timeout of 15000ms exceeded', AxiosError.ECONNABORTED)

    expect(toApiRequestError(error).code).toBe(CLIENT_ERROR_CODES.timeout)
  })

  it('wraps anything else without leaking its message', () => {
    expect(toApiRequestError(new Error('internal detail'))).toMatchObject({
      message: 'Something went wrong',
      code: CLIENT_ERROR_CODES.unknown,
    })
  })
})
