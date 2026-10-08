import { HttpException } from '@nestjs/common'
import type { ApiError, ErrorCode } from '@uptime/shared'

export class AppException extends HttpException {
  constructor(
    statusCode: number,
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message, statusCode)
  }

  toApiError(): ApiError {
    return { statusCode: this.getStatus(), code: this.code, message: this.message }
  }
}
