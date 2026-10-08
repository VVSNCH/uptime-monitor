import { Inject, Injectable } from '@nestjs/common'
import type { RefreshToken } from '@uptime/database'
import { PrismaService } from '@uptime/database/nest'

export interface NewRefreshToken {
  userId: number
  familyId: string
  tokenHash: string
  expiresAt: Date
}

@Injectable()
export class RefreshTokenRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(data: NewRefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({ data })
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } })
  }

  // Conditional update, so two requests racing with the same token cannot
  // both succeed: only one of them flips usedAt from null.
  async markUsed(id: number): Promise<boolean> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, usedAt: null, revokedAt: null },
      data: { usedAt: new Date() },
    })
    return count === 1
  }

  async isFamilyRevoked(familyId: string): Promise<boolean> {
    const revoked = await this.prisma.refreshToken.count({
      where: { familyId, revokedAt: { not: null } },
    })
    return revoked > 0
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
