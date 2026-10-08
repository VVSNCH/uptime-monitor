import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerModule } from '@nestjs/throttler'

import type { Env } from '../config/env.js'
import { AUTH_THROTTLE } from '../constants/index.js'
import { UsersModule } from '../users/users.module.js'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'
import { JwtAuthGuard } from './guards/jwt-auth.guard.js'
import { PasswordService } from './password.service.js'
import { RefreshCookieService } from './refresh-cookie.service.js'
import { RefreshTokenRepository } from './refresh-token.repository.js'
import { TokenService } from './token.service.js'

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
      }),
    }),
    ThrottlerModule.forRoot({ throttlers: [AUTH_THROTTLE] }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    PasswordService,
    RefreshTokenRepository,
    RefreshCookieService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
