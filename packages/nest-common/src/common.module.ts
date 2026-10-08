import { Module } from '@nestjs/common'
import { APP_FILTER, APP_PIPE } from '@nestjs/core'

import { ApiExceptionFilter } from './api-exception.filter.js'
import { LoggingModule } from './logging.module.js'
import { createValidationPipe } from './validation.js'

@Module({
  imports: [LoggingModule],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_PIPE, useFactory: createValidationPipe },
  ],
})
export class CommonModule {}
