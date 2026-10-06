import { ServiceRegistry } from './service-registry.js'
import { ServiceResolver } from './service-resolver.js'
import { MemoryStore } from './testing/memory-store.js'
import type { Registration } from './types.js'

describe('ServiceResolver', () => {
  let store: MemoryStore
  let registry: ServiceRegistry
  let registrations: Registration[]

  beforeEach(() => {
    store = new MemoryStore()
    registry = new ServiceRegistry(store, { onError: () => {} })
    registrations = []
  })

  afterEach(async () => {
    store.failing = false
    await Promise.all(registrations.map((registration) => registration.stop()))
  })

  const register = async (service: string, url: string) => {
    registrations.push(await registry.register(service, url))
  }

  it('returns undefined when nothing is registered', async () => {
    const resolver = new ServiceResolver(registry)

    expect(await resolver.resolve('api')).toBeUndefined()
  })

  it('rotates across live instances', async () => {
    await register('api', 'http://a:3001')
    await register('api', 'http://b:3001')
    const resolver = new ServiceResolver(registry)

    const picks = [
      await resolver.resolve('api'),
      await resolver.resolve('api'),
      await resolver.resolve('api'),
      await resolver.resolve('api'),
    ]

    expect(new Set(picks)).toEqual(new Set(['http://a:3001', 'http://b:3001']))
    expect(picks[0]).toBe(picks[2])
    expect(picks[1]).toBe(picks[3])
    expect(picks[0]).not.toBe(picks[1])
  })

  it('keeps routing to the last known instances when the store is unavailable', async () => {
    await register('api', 'http://a:3001')
    const errors: unknown[] = []
    const resolver = new ServiceResolver(registry, (error) => errors.push(error))
    await resolver.resolve('api')

    store.failing = true

    expect(await resolver.resolve('api')).toBe('http://a:3001')
    expect(errors).toHaveLength(1)
  })

  it('returns undefined when the store is unavailable and nothing was known', async () => {
    store.failing = true
    const resolver = new ServiceResolver(registry, () => {})

    expect(await resolver.resolve('api')).toBeUndefined()
  })
})
