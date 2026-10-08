import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { AppException } from '@uptime/nest-common'
import { ERROR_CODES } from '@uptime/shared'

import { InMemoryRefreshTokens } from '../testing/in-memory-repositories.js'
import { TokenService } from './token.service.js'

const SECRET = 'test-secret-that-is-at-least-32-characters-long'
const USER_ID = 7

function createTokenService(refreshTokens: InMemoryRefreshTokens, secret = SECRET) {
  return new TokenService(
    new JwtService({ secret }),
    refreshTokens.asRepository(),
    new ConfigService({ JWT_ACCESS_TTL_SECONDS: 900, REFRESH_TOKEN_TTL_DAYS: 30 }),
  )
}

async function expectUnauthorized(promise: Promise<unknown>) {
  const error: unknown = await promise.catch((caught: unknown) => caught)
  expect(error).toBeInstanceOf(AppException)
  expect((error as AppException).toApiError()).toMatchObject({
    statusCode: 401,
    code: ERROR_CODES.unauthorized,
  })
}

describe('TokenService', () => {
  let refreshTokens: InMemoryRefreshTokens
  let tokens: TokenService

  beforeEach(() => {
    refreshTokens = new InMemoryRefreshTokens()
    tokens = createTokenService(refreshTokens)
  })

  describe('access tokens', () => {
    it('issues a token that verifies back to the user', async () => {
      const { accessToken, expiresIn } = await tokens.issueAccessToken(USER_ID)

      expect(expiresIn).toBe(900)
      await expect(tokens.verifyAccessToken(accessToken)).resolves.toEqual({ id: USER_ID })
    })

    it('rejects a token signed with another secret', async () => {
      const forged = await createTokenService(refreshTokens, 'x'.repeat(40)).issueAccessToken(1)

      await expectUnauthorized(tokens.verifyAccessToken(forged.accessToken))
    })

    it('rejects garbage', async () => {
      await expectUnauthorized(tokens.verifyAccessToken('not-a-jwt'))
    })
  })

  describe('refresh tokens', () => {
    it('stores only a hash of the token', async () => {
      const refreshToken = await tokens.startSession(USER_ID)

      expect(refreshTokens.rows).toHaveLength(1)
      expect(refreshTokens.rows[0]?.tokenHash).not.toBe(refreshToken)
    })

    it('rotates: the old token is spent and a new one in the same family is issued', async () => {
      const first = await tokens.startSession(USER_ID)

      const rotation = await tokens.rotate(first)

      expect(rotation.userId).toBe(USER_ID)
      expect(rotation.refreshToken).not.toBe(first)
      expect(refreshTokens.rows[0]?.usedAt).not.toBeNull()
      expect(refreshTokens.rows[1]?.familyId).toBe(refreshTokens.rows[0]?.familyId)
    })

    it('treats a reused token as stolen and revokes the whole family', async () => {
      const stolen = await tokens.startSession(USER_ID)
      const { refreshToken: legitimate } = await tokens.rotate(stolen)

      await expectUnauthorized(tokens.rotate(stolen))
      await expectUnauthorized(tokens.rotate(legitimate))
      expect(refreshTokens.rows.every((row) => row.revokedAt !== null)).toBe(true)
    })

    it('lets only one of two simultaneous refreshes win, and revokes the family', async () => {
      const token = await tokens.startSession(USER_ID)

      const results = await Promise.allSettled([tokens.rotate(token), tokens.rotate(token)])
      const winners = results.filter((result) => result.status === 'fulfilled')

      expect(winners).toHaveLength(1)
      const [winner] = winners
      if (winner?.status !== 'fulfilled') throw new Error('expected a winner')
      await expectUnauthorized(tokens.rotate(winner.value.refreshToken))
    })

    it('leaves other sessions alone when one family is revoked', async () => {
      const laptop = await tokens.startSession(USER_ID)
      const phone = await tokens.startSession(USER_ID)

      await tokens.endSession(laptop)

      await expectUnauthorized(tokens.rotate(laptop))
      await expect(tokens.rotate(phone)).resolves.toMatchObject({ userId: USER_ID })
    })

    it('rejects an expired token', async () => {
      const token = await tokens.startSession(USER_ID)
      const row = refreshTokens.rows[0]
      if (row) row.expiresAt = new Date(Date.now() - 1_000)

      await expectUnauthorized(tokens.rotate(token))
    })

    it('rejects a token it never issued', async () => {
      await expectUnauthorized(tokens.rotate('made-up-token'))
    })

    it('ends every session for a user', async () => {
      const laptop = await tokens.startSession(USER_ID)
      const phone = await tokens.startSession(USER_ID)

      await tokens.endAllSessions(USER_ID)

      await expectUnauthorized(tokens.rotate(laptop))
      await expectUnauthorized(tokens.rotate(phone))
    })
  })
})
