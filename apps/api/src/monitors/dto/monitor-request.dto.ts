import { PartialType } from '@nestjs/swagger'
import {
  CHECK_INTERVALS_SECONDS,
  type CheckIntervalSeconds,
  type CreateMonitorRequest,
  HTTP_METHODS,
  type HttpMethod,
  MONITOR_LIMITS,
} from '@uptime/shared'
import { Transform } from 'class-transformer'
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export class CreateMonitorDto implements CreateMonitorRequest {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(MONITOR_LIMITS.nameMaxLength)
  name!: string

  // require_tld is off so a local address such as http://localhost:3001 can be
  // monitored in development; the worker decides what it is allowed to reach.
  @Transform(trim)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true, require_tld: false },
    {
      message: 'url must be a full http:// or https:// address, such as https://example.com/health',
    },
  )
  @MaxLength(MONITOR_LIMITS.urlMaxLength)
  url!: string

  @IsOptional()
  @IsIn(HTTP_METHODS, { message: `method must be one of ${HTTP_METHODS.join(', ')}` })
  method?: HttpMethod

  @IsIn(CHECK_INTERVALS_SECONDS, {
    message: `intervalSeconds must be one of ${CHECK_INTERVALS_SECONDS.join(', ')}`,
  })
  intervalSeconds!: CheckIntervalSeconds

  @IsOptional()
  @IsInt()
  @Min(MONITOR_LIMITS.timeoutMs.min)
  @Max(MONITOR_LIMITS.timeoutMs.max)
  timeoutMs?: number

  /** null means any 2xx counts as up. */
  @IsOptional()
  @IsInt()
  @Min(MONITOR_LIMITS.expectedStatus.min)
  @Max(MONITOR_LIMITS.expectedStatus.max)
  expectedStatus?: number | null

  @IsOptional()
  @IsInt()
  @Min(MONITOR_LIMITS.failureThreshold.min)
  @Max(MONITOR_LIMITS.failureThreshold.max)
  failureThreshold?: number
}

export class UpdateMonitorDto extends PartialType(CreateMonitorDto) {}
