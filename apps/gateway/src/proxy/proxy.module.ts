import {
  Inject,
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common'
import { ServiceResolver } from '@uptime/service-registry'
import { SERVICE_NAMES } from '@uptime/shared'

import { API_ROUTE_PREFIX } from '../constants/index.js'
import { createServiceProxy } from './service-proxy.js'

// Registered as module middleware rather than in main.ts so it runs after the
// request logger, which is what gives proxied requests a request id.
@Module({})
export class ProxyModule implements NestModule {
  constructor(@Inject(ServiceResolver) private readonly resolver: ServiceResolver) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(...createServiceProxy(this.resolver, SERVICE_NAMES.api))
      .forRoutes({ path: `${API_ROUTE_PREFIX.slice(1)}/{*path}`, method: RequestMethod.ALL })
  }
}
