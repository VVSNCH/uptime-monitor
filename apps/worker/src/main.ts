import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { RegistrationService } from '@uptime/service-registry/nest'
import { SERVICE_NAMES } from '@uptime/shared'
import { Logger } from 'nestjs-pino'

import { AppModule } from './app.module.js'
import type { Env } from './config/env.js'

const app = await NestFactory.create(AppModule, { bufferLogs: true })
app.useLogger(app.get(Logger))

const config = app.get<ConfigService<Env, true>>(ConfigService)
app.enableShutdownHooks()

const port = config.get('WORKER_PORT', { infer: true })
const host = config.get('WORKER_HOST', { infer: true })
await app.listen(port)
await app.get(RegistrationService).register(SERVICE_NAMES.worker, `http://${host}:${port}`)
