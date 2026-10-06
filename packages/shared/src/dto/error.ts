import type { ErrorCode } from '../constants/errors.js'

export interface ApiError {
  statusCode: number
  code: ErrorCode
  message: string
}
