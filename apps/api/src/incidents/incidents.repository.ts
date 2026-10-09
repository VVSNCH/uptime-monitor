import { Inject, Injectable } from '@nestjs/common'
import type { Incident } from '@uptime/database'
import { PrismaService } from '@uptime/database/nest'

export type IncidentWithMonitor = Incident & { monitor: { name: string } }

export interface IncidentFilter {
  isOpenOnly: boolean
  limit: number
  monitorId?: number
}

// Scoped through the owning monitor, so an incident is only ever visible to
// the user whose monitor it belongs to.
@Injectable()
export class IncidentsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listForUser(userId: number, filter: IncidentFilter): Promise<IncidentWithMonitor[]> {
    return this.prisma.incident.findMany({
      where: {
        monitor: { userId },
        ...(filter.monitorId === undefined ? {} : { monitorId: filter.monitorId }),
        ...(filter.isOpenOnly ? { endedAt: null } : {}),
      },
      include: { monitor: { select: { name: true } } },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: filter.limit,
    })
  }
}
