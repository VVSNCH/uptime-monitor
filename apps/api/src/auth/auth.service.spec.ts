import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { AppException } from '@uptime/nest-common'
import { ERROR_CODES } from '@uptime/shared'

import { InMemoryRefreshTokens, InMemoryUsers } from '../testing/in-memory-repositories.js'
import { AuthService } from './auth.service.js'
import { PasswordService } from './password.service.js'
import { TokenService } from './token.service.js'

const PASSWORD = 'correct horse battery'

async function captureError(promise: Promise<unknown>): Promise<AppException> {
  const error: unknown = await promise.catch((caught: unknown) => caught)
  expect(error).toBeInstanceOf(AppException)
  return error as AppException
}

describe('AuthService', () => {
  let users: InMemoryUsers
  let refreshTokens: InMemoryRefreshTokens
  let tokens: TokenService
  let auth: AuthService

  beforeEach(() => {
    users = new InMemoryUsers()
    refreshTokens = new InMemoryRefreshTokens()
    tokens = new TokenService(
      new JwtService({ secret: 'test-secret-that-is-at-least-32-characters-long' }),
      refreshTokens.asRepository(),
      new ConfigService({ JWT_ACCESS_TTL_SECONDS: 900, REFRESH_TOKEN_TTL_DAYS: 30 }),
    )
    auth = new AuthService(users.asRepository(), new PasswordService(), tokens)
  })

  describe('register', () => {
    it('normalises the email, hashes the password and signs the user in', async () => {
      const session = await auth.register({ email: '  Ada@Example.COM ', password: PASSWORD })

      expect(session.response.user.email).toBe('ada@example.com')
      expect(session.response.accessToken).toEqual(expect.any(String))
      expect(session.refreshToken).toEqual(expect.any(String))
      expect(users.rows[0]?.passwordHash).toMatch(/^\$argon2id\$/)
    })

    it('rejects an email that is already registered, whatever its case', async () => {
      await auth.register({ email: 'ada@example.com', password: PASSWORD })

      const error = await captureError(
        auth.register({ email: 'ADA@example.com', password: PASSWORD }),
      )

      expect(error.toApiError()).toMatchObject({ statusCode: 409, code: ERROR_CODES.emailTaken })
    })
  })

  describe('login', () => {
    beforeEach(async () => {
      await auth.register({ email: 'ada@example.com', password: PASSWORD })
    })

    it('signs in with the right password, ignoring email case', async () => {
      const session = await auth.login({ email: 'ADA@example.com', password: PASSWORD })

      expect(session.response.user.email).toBe('ada@example.com')
    })

    it('gives the same answer for a wrong password and an unknown email', async () => {
      const wrongPassword = await captureError(
        auth.login({ email: 'ada@example.com', password: 'wrong password' }),
      )
      const unknownEmail = await captureError(
        auth.login({ email: 'nobody@example.com', password: PASSWORD }),
      )

      expect(wrongPassword.toApiError()).toEqual(unknownEmail.toApiError())
      expect(wrongPassword.toApiError()).toMatchObject({
        statusCode: 401,
        code: ERROR_CODES.invalidCredentials,
      })
    })
  })

  describe('changePassword', () => {
    it('refuses when the current password is wrong', async () => {
      const { response } = await auth.register({ email: 'ada@example.com', password: PASSWORD })

      const error = await captureError(
        auth.changePassword(response.user.id, {
          currentPassword: 'not it',
          newPassword: 'a new long password',
        }),
      )

      expect(error.toApiError()).toMatchObject({
        statusCode: 400,
        code: ERROR_CODES.invalidCredentials,
      })
    })

    it('signs out every other session and keeps the current one signed in', async () => {
      const first = await auth.register({ email: 'ada@example.com', password: PASSWORD })
      const otherDevice = await auth.login({ email: 'ada@example.com', password: PASSWORD })

      const current = await auth.changePassword(first.response.user.id, {
        currentPassword: PASSWORD,
        newPassword: 'a new long password',
      })

      await captureError(auth.refresh(otherDevice.refreshToken))
      await expect(auth.refresh(current.refreshToken)).resolves.toBeDefined()
      await captureError(auth.login({ email: 'ada@example.com', password: PASSWORD }))
      await expect(
        auth.login({ email: 'ada@example.com', password: 'a new long password' }),
      ).resolves.toBeDefined()
    })
  })
})
