import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import compression from 'compression'
import helmet from 'helmet'
import { Logger } from 'nestjs-pino'

import { AppModule } from './app.module.js'
import type { Env } from './config/env.js'
import { EVENT_STREAM_TYPE } from './constants/index.js'

// No body parser: the gateway never reads bodies, and parsing one would
// consume the stream before it can be proxied.
const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true })
app.useLogger(app.get(Logger))

const config = app.get<ConfigService<Env, true>>(ConfigService)

app.use(helmet())
// An event stream is written a message at a time. Compressing it would hold
// messages back until a buffer filled, so live updates would arrive late.
app.use(
  compression({
    filter: (req, res) =>
      !(req.headers.accept ?? '').includes(EVENT_STREAM_TYPE) && compression.filter(req, res),
  }),
)
app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true })
app.enableShutdownHooks()

await app.listen(config.get('GATEWAY_PORT', { infer: true }))
