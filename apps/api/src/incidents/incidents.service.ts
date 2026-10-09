import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { AppException } from '@uptime/nest-common'
import { ERROR_CODES, type IncidentResponse } from '@uptime/shared'

import { INCIDENT_PAGE_SIZE } from '../constants/index.js'
import { MonitorsRepository } from '../monitors/monitors.repository.js'
import type { ListIncidentsQueryDto } from './dto/incident.dto.js'
import { toIncidentResponse } from './incident.mapper.js'
import { IncidentsRepository } from './incidents.repository.js'

@Injectable()
export class IncidentsService {
  constructor(
    @Inject(IncidentsRepository) private readonly incidents: IncidentsRepository,
    @Inject(MonitorsRepository) private readonly monitors: MonitorsRepository,
  ) {}

  async list(userId: number, query: ListIncidentsQueryDto): Promise<IncidentResponse[]> {
    const incidents = await this.incidents.listForUser(userId, toFilter(query))
    return incidents.map(toIncidentResponse)
  }

  // Checked first so another user's monitor id answers 404, like every other
  // monitor route, instead of an empty list.
  async listForMonitor(
    userId: number,
    monitorId: number,
    query: ListIncidentsQueryDto,
  ): Promise<IncidentResponse[]> {
    const monitor = await this.monitors.findForUser(userId, monitorId)
    if (!monitor) {
      throw new AppException(HttpStatus.NOT_FOUND, ERROR_CODES.notFound, 'Monitor not found')
    }
    const incidents = await this.incidents.listForUser(userId, { ...toFilter(query), monitorId })
    return incidents.map(toIncidentResponse)
  }
}

function toFilter(query: ListIncidentsQueryDto) {
  return { isOpenOnly: query.open ?? false, limit: query.limit ?? INCIDENT_PAGE_SIZE.default }
}
