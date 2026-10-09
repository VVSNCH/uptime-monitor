import { Inject, Injectable } from '@nestjs/common'
import type { NotificationChannel } from '@uptime/database'
import { PrismaService } from '@uptime/database/nest'
import { TRANSITION, type Transition } from '@uptime/shared'

import type { IncidentContext } from './message.js'

@Injectable()
export class NotifyRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findIncident(incidentId: number): Promise<IncidentContext | null> {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        monitor: {
          select: { id: true, name: true, url: true, failureThreshold: true, userId: true },
        },
      },
    })
    if (!incident) return null
    const { monitor, ...rest } = incident
    return { incident: rest, monitor }
  }

  // Every enabled channel of the owner gets every alert they asked for;
  // routing a channel to particular monitors is out of scope.
  channelsToNotify(userId: number, transition: Transition): Promise<NotificationChannel[]> {
    return this.prisma.notificationChannel.findMany({
      where: {
        userId,
        enabled: true,
        ...(transition === TRANSITION.down ? { sendOnDown: true } : { sendOnRecover: true }),
      },
      orderBy: { id: 'asc' },
    })
  }

  findChannel(id: number): Promise<NotificationChannel | null> {
    return this.prisma.notificationChannel.findUnique({ where: { id } })
  }
}
