import type { ServiceRegistry } from './service-registry.js'
import type { ErrorHandler, ServiceInstance } from './types.js'

export class ServiceResolver {
  private readonly lastKnown = new Map<string, ServiceInstance[]>()
  private readonly cursors = new Map<string, number>()

  constructor(
    private readonly registry: Pick<ServiceRegistry, 'instances'>,
    private readonly onError?: ErrorHandler,
  ) {}

  async resolve(service: string): Promise<string | undefined> {
    const instances = await this.lookup(service)
    if (instances.length === 0) return undefined

    const cursor = this.cursors.get(service) ?? 0
    this.cursors.set(service, cursor + 1)
    return instances[cursor % instances.length]?.url
  }

  // Losing Redis should stop new registrations, not take down routing to
  // instances that were already known to be healthy.
  async lookup(service: string): Promise<ServiceInstance[]> {
    try {
      const live = await this.registry.instances(service)
      this.lastKnown.set(service, live)
      return live
    } catch (error) {
      this.onError?.(error)
      return this.lastKnown.get(service) ?? []
    }
  }
}
