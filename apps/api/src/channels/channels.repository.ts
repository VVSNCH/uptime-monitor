import { Inject, Injectable } from '@nestjs/common'
import { type NotificationChannel, Prisma } from '@uptime/database'
import { PrismaService } from '@uptime/database/nest'
import type { ChannelType } from '@uptime/shared'

const RECORD_NOT_FOUND = 'P2025'

export interface NewChannel {
  type: ChannelType
  target: string
  secret: string | null
  sendOnDown: boolean
  sendOnRecover: boolean
}

export type ChannelChanges = Partial<
  Pick<NotificationChannel, 'target' | 'enabled' | 'sendOnDown' | 'sendOnRecover'>
>

// Every query takes the owner's id, the same rule as monitors.
@Injectable()
export class ChannelsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listForUser(userId: number): Promise<NotificationChannel[]> {
    return this.prisma.notificationChannel.findMany({ where: { userId }, orderBy: { id: 'asc' } })
  }

  findForUser(userId: number, id: number): Promise<NotificationChannel | null> {
    return this.prisma.notificationChannel.findFirst({ where: { id, userId } })
  }

  create(userId: number, channel: NewChannel): Promise<NotificationChannel> {
    return this.prisma.notificationChannel.create({ data: { ...channel, userId } })
  }

  async updateForUser(
    userId: number,
    id: number,
    changes: ChannelChanges,
  ): Promise<NotificationChannel | null> {
    try {
      return await this.prisma.notificationChannel.update({ where: { id, userId }, data: changes })
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        return null
      }
      throw error
    }
  }

  async deleteForUser(userId: number, id: number): Promise<boolean> {
    const { count } = await this.prisma.notificationChannel.deleteMany({ where: { id, userId } })
    return count === 1
  }
}
