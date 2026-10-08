import { VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { RegistrationService } from '@uptime/service-registry/nest'
import { SERVICE_NAMES } from '@uptime/shared'
import cookieParser from 'cookie-parser'
import { Logger } from 'nestjs-pino'

import { setupApiDocs } from './api-docs.js'
import { AppModule } from './app.module.js'
import type { Env } from './config/env.js'
import { DEFAULT_API_VERSION } from './constants/index.js'

const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true })
app.useLogger(app.get(Logger))

const config = app.get<ConfigService<Env, true>>(ConfigService)

// The api is only reachable through the gateway, so the one proxy hop in
// front of it is trusted for the client address that rate limits key on.
app.set('trust proxy', 1)
app.use(cookieParser())
app.enableVersioning({ type: VersioningType.URI, defaultVersion: DEFAULT_API_VERSION })
app.enableShutdownHooks()
if (config.get('API_DOCS_ENABLED', { infer: true })) setupApiDocs(app)

const port = config.get('API_PORT', { infer: true })
const host = config.get('API_HOST', { infer: true })
await app.listen(port)
await app.get(RegistrationService).register(SERVICE_NAMES.api, `http://${host}:${port}`)
