import { Prisma, type RefreshToken, type User } from '@uptime/database'

import type { NewRefreshToken, RefreshTokenRepository } from '../auth/refresh-token.repository.js'
import type { UsersRepository } from '../users/users.repository.js'

export class InMemoryUsers {
  readonly rows: User[] = []

  async findById(id: number): Promise<User | null> {
    return this.rows.find((user) => user.id === id) ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.rows.find((user) => user.email === email) ?? null
  }

  async create(data: { email: string; passwordHash: string }): Promise<User> {
    if (this.rows.some((user) => user.email === data.email)) {
      throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      })
    }
    const user: User = { id: this.rows.length + 1, isDemo: false, createdAt: new Date(), ...data }
    this.rows.push(user)
    return user
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    const user = this.rows.find((row) => row.id === id)
    if (user) user.passwordHash = passwordHash
  }

  asRepository(): UsersRepository {
    return this as unknown as UsersRepository
  }
}

export class InMemoryRefreshTokens {
  readonly rows: RefreshToken[] = []

  async create(data: NewRefreshToken): Promise<void> {
    this.rows.push({
      id: this.rows.length + 1,
      usedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      ...data,
    })
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.rows.find((row) => row.tokenHash === tokenHash) ?? null
  }

  async markUsed(id: number): Promise<boolean> {
    const row = this.rows.find((candidate) => candidate.id === id)
    if (!row || row.usedAt || row.revokedAt) return false
    row.usedAt = new Date()
    return true
  }

  async isFamilyRevoked(familyId: string): Promise<boolean> {
    return this.rows.some((row) => row.familyId === familyId && row.revokedAt !== null)
  }

  async revokeFamily(familyId: string): Promise<void> {
    for (const row of this.rows) {
      if (row.familyId === familyId) row.revokedAt ??= new Date()
    }
  }

  async revokeAllForUser(userId: number): Promise<void> {
    for (const row of this.rows) {
      if (row.userId === userId) row.revokedAt ??= new Date()
    }
  }

  asRepository(): RefreshTokenRepository {
    return this as unknown as RefreshTokenRepository
  }
}
