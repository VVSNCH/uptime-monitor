import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '@uptime/database/nest'
import { CommonModule } from '@uptime/nest-common'
import { ServiceRegistryModule } from '@uptime/service-registry/nest'

import { CheckModule } from './check/check.module.js'
import { validateEnv } from './config/env.js'
import { HealthModule } from './health/health.module.js'
import { NotifyModule } from './notify/notify.module.js'

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
    CheckModule,
    NotifyModule,
  ],
})
export class AppModule {}
