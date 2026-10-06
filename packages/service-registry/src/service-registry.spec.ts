import { ServiceRegistry } from './service-registry.js'
import { MemoryStore } from './testing/memory-store.js'
import type { Registration } from './types.js'

describe('ServiceRegistry', () => {
  let store: MemoryStore
  let now: number
  let registrations: Registration[]

  const createRegistry = (onError?: (error: unknown) => void) =>
    new ServiceRegistry(store, { instanceTtlMs: 15_000, now: () => now, onError })

  const register = async (registry: ServiceRegistry, service: string, url: string) => {
    const registration = await registry.register(service, url)
    registrations.push(registration)
    return registration
  }

  beforeEach(() => {
    store = new MemoryStore()
    now = 1_000_000
    registrations = []
  })

  afterEach(async () => {
    store.failing = false
    await Promise.all(registrations.map((registration) => registration.stop()))
  })

  it('lists a registered instance', async () => {
    const registry = createRegistry()
    await register(registry, 'api', 'http://localhost:3001')

    const instances = await registry.instances('api')

    expect(instances).toHaveLength(1)
    expect(instances[0]).toMatchObject({ url: 'http://localhost:3001', lastSeen: now })
  })

  it('keeps services separate', async () => {
    const registry = createRegistry()
    await register(registry, 'api', 'http://localhost:3001')

    expect(await registry.instances('worker')).toEqual([])
  })

  it('drops and prunes an instance whose heartbeat is older than the ttl', async () => {
    const registry = createRegistry()
    await register(registry, 'api', 'http://localhost:3001')

    now += 15_001

    expect(await registry.instances('api')).toEqual([])
    expect(store.hashes.get('registry:api')?.size).toBe(0)
  })

  it('keeps an instance alive while it heartbeats', async () => {
    const registry = createRegistry()
    const registration = await register(registry, 'api', 'http://localhost:3001')

    now += 10_000
    await registration.heartbeat()
    now += 10_000

    expect(await registry.instances('api')).toHaveLength(1)
  })

  it('removes the instance on stop', async () => {
    const registry = createRegistry()
    const registration = await register(registry, 'api', 'http://localhost:3001')

    await registration.stop()

    expect(await registry.instances('api')).toEqual([])
  })

  it('ignores entries that are not valid instances', async () => {
    const registry = createRegistry()
    await store.hset('registry:api', 'garbage', 'not json')
    await store.hset('registry:api', 'partial', JSON.stringify({ url: 'http://x' }))

    expect(await registry.instances('api')).toEqual([])
    expect(store.hashes.get('registry:api')?.size).toBe(0)
  })

  it('reports a failed heartbeat instead of throwing', async () => {
    const errors: unknown[] = []
    const registry = createRegistry((error) => errors.push(error))
    store.failing = true

    await expect(register(registry, 'api', 'http://localhost:3001')).resolves.toBeDefined()
    expect(errors).toHaveLength(1)
  })

  it('registers once the store recovers', async () => {
    const registry = createRegistry(() => {})
    store.failing = true
    const registration = await register(registry, 'api', 'http://localhost:3001')

    store.failing = false
    await registration.heartbeat()

    expect(await registry.instances('api')).toHaveLength(1)
  })
})
