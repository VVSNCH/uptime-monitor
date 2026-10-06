import { Controller, Get, Inject } from '@nestjs/common'
import { ServiceResolver } from '@uptime/service-registry'
import { RegistrationService } from '@uptime/service-registry/nest'
import { type GatewayHealthResponse, type LivenessResponse, SERVICE_NAMES } from '@uptime/shared'

@Controller('health')
export class HealthController {
  constructor(
    @Inject(ServiceResolver) private readonly resolver: ServiceResolver,
    @Inject(RegistrationService) private readonly registration: RegistrationService,
  ) {}

  // Stays 200 when Redis is down: routing continues from the last known
  // instances, so pulling the gateway out of rotation would make things worse.
  @Get()
  async check(): Promise<GatewayHealthResponse> {
    const [api, worker, isRedisUp] = await Promise.all([
      this.resolver.lookup(SERVICE_NAMES.api),
      this.resolver.lookup(SERVICE_NAMES.worker),
      this.registration.isRedisReachable(),
    ])
    return {
      status: isRedisUp ? 'ok' : 'degraded',
      service: SERVICE_NAMES.gateway,
      uptimeSeconds: Math.round(process.uptime()),
      dependencies: { redis: isRedisUp ? 'up' : 'down' },
      instances: { api: api.length, worker: worker.length },
    }
  }

  @Get('live')
  live(): LivenessResponse {
    return { status: 'ok', service: SERVICE_NAMES.gateway }
  }
}
