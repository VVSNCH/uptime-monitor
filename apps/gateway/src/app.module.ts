import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CommonModule } from '@uptime/nest-common'
import { ServiceRegistryModule } from '@uptime/service-registry/nest'

import { validateEnv } from './config/env.js'
import { HealthModule } from './health/health.module.js'
import { ProxyModule } from './proxy/proxy.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    ServiceRegistryModule.forRoot(),
    CommonModule,
    HealthModule,
    ProxyModule,
  ],
})
export class AppModule {}
