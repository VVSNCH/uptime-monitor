import { type DynamicModule, Logger, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Redis } from 'ioredis'

import { ServiceRegistry } from '../service-registry.js'
import { ServiceResolver } from '../service-resolver.js'
import { createRedis } from './redis.js'
import { RegistrationService } from './registration.service.js'
import { REGISTRY_REDIS } from './tokens.js'

@Module({})
export class ServiceRegistryModule {
  static forRoot(): DynamicModule {
    const logger = new Logger('ServiceRegistry')

    return {
      module: ServiceRegistryModule,
      global: true,
      providers: [
        {
          provide: REGISTRY_REDIS,
          inject: [ConfigService],
          useFactory: (config: ConfigService) =>
            createRedis(config.getOrThrow<string>('REDIS_URL'), logger),
        },
        {
          provide: ServiceRegistry,
          inject: [REGISTRY_REDIS],
          useFactory: (redis: Redis) => new ServiceRegistry(redis),
        },
        {
          provide: ServiceResolver,
          inject: [ServiceRegistry],
          useFactory: (registry: ServiceRegistry) => new ServiceResolver(registry),
        },
        RegistrationService,
      ],
      exports: [ServiceResolver, RegistrationService],
    }
  }
}
