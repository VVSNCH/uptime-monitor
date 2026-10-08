import { HttpStatus, type ValidationError, ValidationPipe } from '@nestjs/common'
import { ERROR_CODES } from '@uptime/shared'

import { AppException } from './app.exception.js'

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.validationFailed,
        collectMessages(errors).join('; '),
      ),
  })
}

function collectMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...collectMessages(error.children ?? []),
  ])
}
