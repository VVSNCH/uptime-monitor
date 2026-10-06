import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '@uptime/database/nest'
import { CommonModule } from '@uptime/nest-common'
import { ServiceRegistryModule } from '@uptime/service-registry/nest'

import { validateEnv } from './config/env.js'
import { HealthModule } from './health/health.module.js'

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
  ],
})
export class AppModule {}
