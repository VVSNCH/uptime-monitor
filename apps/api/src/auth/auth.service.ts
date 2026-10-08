import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { Prisma } from '@uptime/database'
import { AppException } from '@uptime/nest-common'
import {
  type AuthResponse,
  type ChangePasswordRequest,
  ERROR_CODES,
  type LoginRequest,
  type RegisterRequest,
  type UserResponse,
} from '@uptime/shared'

import { toUserResponse } from '../users/user.mapper.js'
import { UsersRepository } from '../users/users.repository.js'
import { PasswordService } from './password.service.js'
import { TokenService } from './token.service.js'

const UNIQUE_VIOLATION = 'P2002'

export interface Session {
  response: AuthResponse
  refreshToken: string
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersRepository) private readonly users: UsersRepository,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(TokenService) private readonly tokens: TokenService,
  ) {}

  async register({ email, password }: RegisterRequest): Promise<Session> {
    const passwordHash = await this.passwords.hash(password)
    try {
      const user = await this.users.create({ email: normaliseEmail(email), passwordHash })
      return await this.openSession(toUserResponse(user))
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ERROR_CODES.emailTaken,
          'An account with this email already exists',
        )
      }
      throw error
    }
  }

  async login({ email, password }: LoginRequest): Promise<Session> {
    const user = await this.users.findByEmail(normaliseEmail(email))
    const isValid = user
      ? await this.passwords.verify(user.passwordHash, password)
      : await this.passwords.verifyDecoy(password)

    if (!user || !isValid) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.invalidCredentials,
        'Email or password is incorrect',
      )
    }
    return this.openSession(toUserResponse(user))
  }

  async refresh(refreshToken: string): Promise<Session> {
    const rotation = await this.tokens.rotate(refreshToken)
    const user = await this.requireUser(rotation.userId)
    const accessToken = await this.tokens.issueAccessToken(user.id)
    return { response: { ...accessToken, user }, refreshToken: rotation.refreshToken }
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokens.endSession(refreshToken)
  }

  logoutEverywhere(userId: number): Promise<void> {
    return this.tokens.endAllSessions(userId)
  }

  // Every other session is signed out; the one that made the change gets a
  // fresh session so the user is not bounced to the sign-in screen.
  async changePassword(
    userId: number,
    { currentPassword, newPassword }: ChangePasswordRequest,
  ): Promise<Session> {
    const user = await this.users.findById(userId)
    const isValid = user ? await this.passwords.verify(user.passwordHash, currentPassword) : false
    if (!user || !isValid) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ERROR_CODES.invalidCredentials,
        'Current password is incorrect',
      )
    }

    await this.users.updatePasswordHash(user.id, await this.passwords.hash(newPassword))
    await this.tokens.endAllSessions(user.id)
    return this.openSession(toUserResponse(user))
  }

  async currentUser(userId: number): Promise<UserResponse> {
    return this.requireUser(userId)
  }

  private async openSession(user: UserResponse): Promise<Session> {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.issueAccessToken(user.id),
      this.tokens.startSession(user.id),
    ])
    return { response: { ...accessToken, user }, refreshToken }
  }

  private async requireUser(userId: number): Promise<UserResponse> {
    const user = await this.users.findById(userId)
    if (!user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.unauthorized,
        'This account no longer exists',
      )
    }
    return toUserResponse(user)
  }
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}
