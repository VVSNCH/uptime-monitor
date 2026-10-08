import { Inject, Injectable } from '@nestjs/common'
import { type Monitor, Prisma } from '@uptime/database'
import { PrismaService } from '@uptime/database/nest'

const RECORD_NOT_FOUND = 'P2025'

export interface MonitorFields {
  name: string
  url: string
  method: string
  intervalSeconds: number
  timeoutMs: number
  expectedStatus: number | null
  failureThreshold: number
}

// Every query takes the owner's id and filters on it here, not in the
// controller, so no endpoint can forget to.
@Injectable()
export class MonitorsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listForUser(userId: number): Promise<Monitor[]> {
    return this.prisma.monitor.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  }

  findForUser(userId: number, id: number): Promise<Monitor | null> {
    return this.prisma.monitor.findFirst({ where: { id, userId } })
  }

  create(userId: number, fields: MonitorFields): Promise<Monitor> {
    return this.prisma.monitor.create({ data: { ...fields, userId } })
  }

  updateForUser(
    userId: number,
    id: number,
    fields: Partial<MonitorFields> & { paused?: boolean },
  ): Promise<Monitor | null> {
    return orNull(this.prisma.monitor.update({ where: { id, userId }, data: fields }))
  }

  async deleteForUser(userId: number, id: number): Promise<boolean> {
    const { count } = await this.prisma.monitor.deleteMany({ where: { id, userId } })
    return count === 1
  }
}

async function orNull<T>(query: Promise<T>): Promise<T | null> {
  try {
    return await query
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === RECORD_NOT_FOUND) {
      return null
    }
    throw error
  }
}
