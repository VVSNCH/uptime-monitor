import { Controller, Get, Inject, Param, ParseIntPipe, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import type { AuthUser } from '../auth/auth.types.js'
import { CurrentUser } from '../auth/decorators/current-user.decorator.js'
import {
  CheckHistoryQueryDto,
  CheckResultDto,
  StatsQueryDto,
  UptimeStatsDto,
} from './dto/stats.dto.js'
import { StatsService } from './stats.service.js'

@ApiTags('monitors')
@ApiBearerAuth()
@Controller('monitors/:id')
export class StatsController {
  constructor(@Inject(StatsService) private readonly stats: StatsService) {}

  /** Uptime and average response time over a window, with one entry per day for 7d, 30d and 90d. */
  @Get('stats')
  getStats(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: StatsQueryDto,
  ): Promise<UptimeStatsDto> {
    return this.stats.stats(user.id, id, query.window)
  }

  /** Individual check results, oldest first, for the response-time chart. */
  @Get('checks')
  listChecks(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: CheckHistoryQueryDto,
  ): Promise<CheckResultDto[]> {
    return this.stats.checks(user.id, id, query)
  }
}
