import type { ServiceName } from '../constants/services.js'

export type DependencyStatus = 'up' | 'down'

export interface HealthResponse {
  status: 'ok' | 'degraded'
  service: ServiceName
  uptimeSeconds: number
  dependencies: {
    database?: DependencyStatus
    redis: DependencyStatus
  }
}

export interface GatewayHealthResponse extends HealthResponse {
  instances: Record<Exclude<ServiceName, 'gateway'>, number>
}

export interface LivenessResponse {
  status: 'ok'
  service: ServiceName
}
