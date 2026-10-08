import { Inject, Injectable } from '@nestjs/common'
import type { User } from '@uptime/database'
import { PrismaService } from '@uptime/database/nest'

@Injectable()
export class UsersRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  create(data: { email: string; passwordHash: string }): Promise<User> {
    return this.prisma.user.create({ data })
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } })
  }
}
