export interface ServiceInstance {
  instanceId: string
  url: string
  lastSeen: number
}

export interface RegistryStore {
  hset(key: string, field: string, value: string): Promise<unknown>
  hgetall(key: string): Promise<Record<string, string>>
  hdel(key: string, ...fields: string[]): Promise<unknown>
}

export interface Registration {
  instanceId: string
  heartbeat(): Promise<void>
  stop(): Promise<void>
}

export type ErrorHandler = (error: unknown) => void
