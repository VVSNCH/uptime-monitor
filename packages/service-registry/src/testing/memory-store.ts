import type { RegistryStore } from '../types.js'

export class MemoryStore implements RegistryStore {
  readonly hashes = new Map<string, Map<string, string>>()
  failing = false

  async hset(key: string, field: string, value: string): Promise<number> {
    this.assertAvailable()
    const hash = this.hashes.get(key) ?? new Map<string, string>()
    hash.set(field, value)
    this.hashes.set(key, hash)
    return 1
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    this.assertAvailable()
    return Object.fromEntries(this.hashes.get(key) ?? [])
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    this.assertAvailable()
    const hash = this.hashes.get(key)
    return fields.filter((field) => hash?.delete(field)).length
  }

  private assertAvailable() {
    if (this.failing) throw new Error('store unavailable')
  }
}
