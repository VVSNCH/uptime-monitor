import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'

import { resolveRequestId } from './request-id.js'

const DEFAULT_LOG_LEVEL = 'info'
const QUIET_PATHS = ['/health', '/v1/health']

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL') ?? DEFAULT_LOG_LEVEL,
          transport:
            config.get<string>('LOG_FORMAT') === 'pretty'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          genReqId: resolveRequestId,
          autoLogging: {
            ignore: (req) => QUIET_PATHS.some((path) => req.url?.startsWith(path) ?? false),
          },
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
      }),
    }),
  ],
})
export class LoggingModule {}
