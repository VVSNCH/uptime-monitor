import type { IncidentResponse } from '@uptime/shared'
import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator'

import { INCIDENT_PAGE_SIZE } from '../../constants/index.js'

export class ListIncidentsQueryDto {
  /** Only incidents that have not ended yet. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  open?: boolean

  /** Newest first. Defaults to 50, at most 100. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(INCIDENT_PAGE_SIZE.max)
  limit?: number
}

export class IncidentDto implements IncidentResponse {
  id!: number
  monitorId!: number
  monitorName!: string
  /** ISO 8601. When the first failure of the outage happened. */
  startedAt!: string
  /** ISO 8601, or null while the incident is still open. */
  endedAt!: string | null
  /** Null while the incident is still open. */
  durationSeconds!: number | null
  /** What the failing check reported, such as "HTTP 502" or "Timed out after 10000 ms". */
  cause!: string
}
