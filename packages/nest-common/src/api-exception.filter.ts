import type { ServerResponse } from 'node:http'

import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { type ApiError, ERROR_CODES, type ErrorCode } from '@uptime/shared'

import { AppException } from './app.exception.js'

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.badRequest,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.unauthorized,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.forbidden,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.notFound,
  [HttpStatus.CONFLICT]: ERROR_CODES.conflict,
  [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.rateLimited,
  [HttpStatus.SERVICE_UNAVAILABLE]: ERROR_CODES.serviceUnavailable,
}

const INTERNAL_MESSAGE = 'Something went wrong'
const FIRST_SERVER_ERROR: number = HttpStatus.INTERNAL_SERVER_ERROR

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = this.toApiError(exception)

    if (body.statusCode >= FIRST_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : exception,
      )
    }

    const response = host.switchToHttp().getResponse<ServerResponse>()
    response.statusCode = body.statusCode
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify(body))
  }

  private toApiError(exception: unknown): ApiError {
    if (exception instanceof AppException) return exception.toApiError()

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus()
      const isServerError = statusCode >= FIRST_SERVER_ERROR
      return {
        statusCode,
        code:
          CODE_BY_STATUS[statusCode] ??
          (isServerError ? ERROR_CODES.internal : ERROR_CODES.badRequest),
        message: isServerError ? INTERNAL_MESSAGE : exception.message,
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.internal,
      message: INTERNAL_MESSAGE,
    }
  }
}
