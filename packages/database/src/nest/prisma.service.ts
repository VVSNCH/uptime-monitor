import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../generated/prisma/client.js'
import { SESSION_OPTIONS } from '../session.js'

const CONNECTION_TIMEOUT_MS = 5_000
const DEFAULT_POOL_SIZE = 10

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ConfigService) config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
        connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
        max: config.get<number>('DATABASE_POOL_SIZE') ?? DEFAULT_POOL_SIZE,
        options: SESSION_OPTIONS,
      }),
    })
  }

  async isReachable(timeoutMs: number): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Database check timed out')), timeoutMs)
    })
    try {
      await Promise.race([this.$queryRaw`SELECT 1`, timeout])
      return true
    } catch {
      return false
    } finally {
      clearTimeout(timer)
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
