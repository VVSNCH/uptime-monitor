import { Controller, Get, Inject, Param, ParseIntPipe, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import type { AuthUser } from '../auth/auth.types.js'
import { CurrentUser } from '../auth/decorators/current-user.decorator.js'
import { IncidentDto, ListIncidentsQueryDto } from './dto/incident.dto.js'
import { IncidentsService } from './incidents.service.js'

@ApiTags('incidents')
@ApiBearerAuth()
@Controller()
export class IncidentsController {
  constructor(@Inject(IncidentsService) private readonly incidents: IncidentsService) {}

  @Get('incidents')
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListIncidentsQueryDto,
  ): Promise<IncidentDto[]> {
    return this.incidents.list(user.id, query)
  }

  @Get('monitors/:id/incidents')
  listForMonitor(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListIncidentsQueryDto,
  ): Promise<IncidentDto[]> {
    return this.incidents.listForMonitor(user.id, id, query)
  }
}
