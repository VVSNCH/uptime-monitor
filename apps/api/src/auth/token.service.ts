import { createHash, randomBytes, randomUUID } from 'node:crypto'

import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { AppException } from '@uptime/nest-common'
import { ERROR_CODES } from '@uptime/shared'

import type { Env } from '../config/env.js'
import { MS_PER_DAY, REFRESH_TOKEN_BYTES } from '../constants/index.js'
import type { AccessTokenPayload, AuthUser } from './auth.types.js'
import { RefreshTokenRepository } from './refresh-token.repository.js'

const SESSION_EXPIRED = 'Your session has expired, sign in again'

export interface AccessToken {
  accessToken: string
  expiresIn: number
}

export interface Rotation {
  userId: number
  refreshToken: string
}

@Injectable()
export class TokenService {
  private readonly accessTtlSeconds: number
  private readonly refreshTtlMs: number

  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(RefreshTokenRepository) private readonly refreshTokens: RefreshTokenRepository,
    @Inject(ConfigService) config: ConfigService<Env, true>,
  ) {
    this.accessTtlSeconds = config.get('JWT_ACCESS_TTL_SECONDS', { infer: true })
    this.refreshTtlMs = config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * MS_PER_DAY
  }

  async issueAccessToken(userId: number): Promise<AccessToken> {
    const payload: AccessTokenPayload = { sub: userId }
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: this.accessTtlSeconds })
    return { accessToken, expiresIn: this.accessTtlSeconds }
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        algorithms: ['HS256'],
      })
      return { id: payload.sub }
    } catch {
      throw unauthorized('Your session is invalid or has expired')
    }
  }

  startSession(userId: number): Promise<string> {
    return this.createRefreshToken(userId, randomUUID())
  }

  // Each refresh token works once. Presenting one that was already used means
  // it was copied, so the whole login it belongs to is revoked. Revocation is
  // checked across the family, not just this row: a token issued by a request
  // racing the revocation would otherwise survive it.
  async rotate(rawToken: string): Promise<Rotation> {
    const record = await this.refreshTokens.findByHash(hashToken(rawToken))
    if (!record) throw unauthorized(SESSION_EXPIRED)

    const isSpent = record.usedAt !== null || record.revokedAt !== null
    if (isSpent || (await this.refreshTokens.isFamilyRevoked(record.familyId))) {
      await this.refreshTokens.revokeFamily(record.familyId)
      throw unauthorized(SESSION_EXPIRED)
    }

    if (record.expiresAt <= new Date()) {
      throw unauthorized(SESSION_EXPIRED)
    }

    const isClaimed = await this.refreshTokens.markUsed(record.id)
    if (!isClaimed) {
      await this.refreshTokens.revokeFamily(record.familyId)
      throw unauthorized(SESSION_EXPIRED)
    }

    const refreshToken = await this.createRefreshToken(record.userId, record.familyId)
    return { userId: record.userId, refreshToken }
  }

  async endSession(rawToken: string): Promise<void> {
    const record = await this.refreshTokens.findByHash(hashToken(rawToken))
    if (record) await this.refreshTokens.revokeFamily(record.familyId)
  }

  endAllSessions(userId: number): Promise<void> {
    return this.refreshTokens.revokeAllForUser(userId)
  }

  private async createRefreshToken(userId: number, familyId: string): Promise<string> {
    const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
    await this.refreshTokens.create({
      userId,
      familyId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + this.refreshTtlMs),
    })
    return rawToken
  }
}

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

function unauthorized(message: string): AppException {
  return new AppException(HttpStatus.UNAUTHORIZED, ERROR_CODES.unauthorized, message)
}
