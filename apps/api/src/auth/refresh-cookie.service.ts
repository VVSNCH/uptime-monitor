import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { CookieOptions, Request, Response } from 'express'

import type { Env } from '../config/env.js'
import { MS_PER_DAY, REFRESH_COOKIE_NAME } from '../constants/index.js'

// The refresh token never reaches JavaScript: httpOnly keeps it away from
// scripts, and the path keeps the browser from sending it anywhere but /auth.
@Injectable()
export class RefreshCookieService {
  private readonly options: CookieOptions
  private readonly maxAgeMs: number

  constructor(@Inject(ConfigService) config: ConfigService<Env, true>) {
    this.options = {
      httpOnly: true,
      secure: config.get('COOKIE_SECURE', { infer: true }),
      sameSite: config.get('COOKIE_SAME_SITE', { infer: true }),
      path: config.get('REFRESH_COOKIE_PATH', { infer: true }),
    }
    this.maxAgeMs = config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * MS_PER_DAY
  }

  read(request: Request): string | null {
    const value: unknown = request.cookies[REFRESH_COOKIE_NAME]
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  write(response: Response, refreshToken: string): void {
    response.cookie(REFRESH_COOKIE_NAME, refreshToken, { ...this.options, maxAge: this.maxAgeMs })
  }

  clear(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, this.options)
  }
}
