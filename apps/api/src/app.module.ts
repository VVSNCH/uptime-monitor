import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '@uptime/database/nest'
import { CommonModule } from '@uptime/nest-common'
import { ServiceRegistryModule } from '@uptime/service-registry/nest'

import { AuthModule } from './auth/auth.module.js'
import { ChannelsModule } from './channels/channels.module.js'
import { validateEnv } from './config/env.js'
import { HealthModule } from './health/health.module.js'
import { IncidentsModule } from './incidents/incidents.module.js'
import { MonitorsModule } from './monitors/monitors.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    ServiceRegistryModule.forRoot(),
    CommonModule,
    HealthModule,
    AuthModule,
    MonitorsModule,
    IncidentsModule,
    ChannelsModule,
  ],
})
export class AppModule {}
