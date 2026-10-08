import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

export const API_DOCS_PATH = 'docs'

// The server is /api because clients only ever reach the api through the
// gateway, so "try it out" has to go that way too.
export function setupApiDocs(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Uptime Monitor API')
    .setDescription('Monitors, checks, incidents and notification channels.')
    .setVersion('1')
    .addServer('/api')
    .addBearerAuth()
    .build()

  SwaggerModule.setup(API_DOCS_PATH, app, SwaggerModule.createDocument(app, config))
}
