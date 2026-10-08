import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import type { AuthUser } from '../auth/auth.types.js'
import { CurrentUser } from '../auth/decorators/current-user.decorator.js'
import { CreateMonitorDto, UpdateMonitorDto } from './dto/monitor-request.dto.js'
import { MonitorDetailDto, MonitorSummaryDto } from './dto/monitor-response.dto.js'
import { MonitorsService } from './monitors.service.js'

@ApiTags('monitors')
@ApiBearerAuth()
@Controller('monitors')
export class MonitorsController {
  constructor(@Inject(MonitorsService) private readonly monitors: MonitorsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<MonitorSummaryDto[]> {
    return this.monitors.list(user.id)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateMonitorDto): Promise<MonitorDetailDto> {
    return this.monitors.create(user.id, body)
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MonitorDetailDto> {
    return this.monitors.get(user.id, id)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMonitorDto,
  ): Promise<MonitorDetailDto> {
    return this.monitors.update(user.id, id, body)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.monitors.remove(user.id, id)
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  pause(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MonitorDetailDto> {
    return this.monitors.setPaused(user.id, id, true)
  }

  @Post(':id/resume')
  @HttpCode(HttpStatus.OK)
  resume(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MonitorDetailDto> {
    return this.monitors.setPaused(user.id, id, false)
  }
}
