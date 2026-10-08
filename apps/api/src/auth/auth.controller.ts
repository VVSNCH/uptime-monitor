import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger'
import { ThrottlerGuard } from '@nestjs/throttler'
import { AppException } from '@uptime/nest-common'
import { ERROR_CODES } from '@uptime/shared'
import type { Request, Response } from 'express'

import { REFRESH_COOKIE_NAME } from '../constants/index.js'
import { AuthService, type Session } from './auth.service.js'
import type { AuthUser } from './auth.types.js'
import { CurrentUser } from './decorators/current-user.decorator.js'
import { Public } from './decorators/public.decorator.js'
import { AuthResponseDto, UserDto } from './dto/auth-response.dto.js'
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/credentials.dto.js'
import { RefreshCookieService } from './refresh-cookie.service.js'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(RefreshCookieService) private readonly cookies: RefreshCookieService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(res, await this.auth.register(body))
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(res, await this.auth.login(body))
  }

  @Public()
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = this.cookies.read(req)
    if (!refreshToken) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ERROR_CODES.unauthorized,
        'Sign in to continue',
      )
    }

    try {
      return this.respond(res, await this.auth.refresh(refreshToken))
    } catch (error) {
      this.cookies.clear(res)
      throw error
    }
  }

  @Public()
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const refreshToken = this.cookies.read(req)
    if (refreshToken) await this.auth.logout(refreshToken)
    this.cookies.clear(res)
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logoutEverywhere(user.id)
    this.cookies.clear(res)
  }

  @ApiBearerAuth()
  @Patch('password')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    return this.respond(res, await this.auth.changePassword(user.id, body))
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.auth.currentUser(user.id)
  }

  private respond(res: Response, session: Session): AuthResponseDto {
    this.cookies.write(res, session.refreshToken)
    return session.response
  }
}
