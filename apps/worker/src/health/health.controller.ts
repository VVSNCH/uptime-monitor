import { Controller, Get, Inject, Res } from '@nestjs/common'
import { PrismaService } from '@uptime/database/nest'
import { RegistrationService } from '@uptime/service-registry/nest'
import { type HealthResponse, type LivenessResponse, SERVICE_NAMES } from '@uptime/shared'
import type { Response } from 'express'

import { HEALTH_CHECK_TIMEOUT_MS } from '../constants/index.js'

@Controller('health')
export class HealthController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RegistrationService) private readonly registration: RegistrationService,
  ) {}

  // Readiness: can this instance serve traffic right now.
  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const [isDatabaseUp, isRedisUp] = await Promise.all([
      this.prisma.isReachable(HEALTH_CHECK_TIMEOUT_MS),
      this.registration.isRedisReachable(),
    ])
    const isHealthy = isDatabaseUp && isRedisUp
    res.status(isHealthy ? 200 : 503)

    return {
      status: isHealthy ? 'ok' : 'degraded',
      service: SERVICE_NAMES.worker,
      uptimeSeconds: Math.round(process.uptime()),
      dependencies: { database: isDatabaseUp ? 'up' : 'down', redis: isRedisUp ? 'up' : 'down' },
    }
  }

  // Liveness never checks dependencies: a database outage is not a reason to
  // restart a process that is otherwise fine.
  @Get('live')
  live(): LivenessResponse {
    return { status: 'ok', service: SERVICE_NAMES.worker }
  }
}
