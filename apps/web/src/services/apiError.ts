import { type ApiError, ERROR_CODES, type ErrorCode } from '@uptime/shared'
import { isAxiosError } from 'axios'

import { CLIENT_ERROR_CODES, type ClientErrorCode } from '../constants/api'

export class ApiRequestError extends Error {
  override readonly name = 'ApiRequestError'

  constructor(
    message: string,
    readonly statusCode: number | null,
    readonly code: ErrorCode | ClientErrorCode,
  ) {
    super(message)
  }

  get isClientError(): boolean {
    return this.statusCode !== null && this.statusCode >= 400 && this.statusCode < 500
  }
}

const KNOWN_CODES = new Set<string>(Object.values(ERROR_CODES))

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    KNOWN_CODES.has(value.code) &&
    'message' in value &&
    typeof value.message === 'string'
  )
}

export function toApiRequestError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error

  if (!isAxiosError(error)) {
    return new ApiRequestError('Something went wrong', null, CLIENT_ERROR_CODES.unknown)
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiRequestError(
      'The server took too long to respond',
      null,
      CLIENT_ERROR_CODES.timeout,
    )
  }

  const { response } = error
  if (!response) {
    return new ApiRequestError('Cannot reach the server', null, CLIENT_ERROR_CODES.network)
  }

  if (isApiError(response.data)) {
    return new ApiRequestError(response.data.message, response.status, response.data.code)
  }

  return new ApiRequestError(
    `Request failed with status ${response.status}`,
    response.status,
    CLIENT_ERROR_CODES.unknown,
  )
}
