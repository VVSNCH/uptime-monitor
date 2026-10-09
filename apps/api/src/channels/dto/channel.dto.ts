import {
  CHANNEL_TYPE,
  type ChannelResponse,
  type ChannelTestResult,
  type ChannelType,
  type CreateChannelRequest,
  MONITOR_LIMITS,
  type UpdateChannelRequest,
} from '@uptime/shared'
import { Transform } from 'class-transformer'
import {
  IsBoolean,
  isEmail,
  IsIn,
  IsOptional,
  IsString,
  isURL,
  MaxLength,
  Validate,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator'

const CHANNEL_TYPES = Object.values(CHANNEL_TYPE)
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value)

export const WEBHOOK_URL_OPTIONS = {
  protocols: ['http', 'https'],
  require_protocol: true,
  require_tld: false,
}
export const EMAIL_TARGET_MESSAGE = 'target must be an email address for an email channel'
export const WEBHOOK_TARGET_MESSAGE =
  'target must be a full http:// or https:// address for a webhook channel'

export function isValidTarget(type: unknown, target: unknown): boolean {
  if (typeof target !== 'string') return false
  if (type === CHANNEL_TYPE.email) return isEmail(target)
  if (type === CHANNEL_TYPE.webhook) return isURL(target, WEBHOOK_URL_OPTIONS)
  return false
}

export function targetMessage(type: unknown): string {
  return type === CHANNEL_TYPE.email ? EMAIL_TARGET_MESSAGE : WEBHOOK_TARGET_MESSAGE
}

// One rule that reads the type, rather than two conditional ones: class-validator
// skips every check on a field when any of its conditions is false.
@ValidatorConstraint({ name: 'matchesChannelType' })
class MatchesChannelType implements ValidatorConstraintInterface {
  validate(target: unknown, args: ValidationArguments): boolean {
    return isValidTarget((args.object as { type?: unknown }).type, target)
  }

  defaultMessage(args: ValidationArguments): string {
    return targetMessage((args.object as { type?: unknown }).type)
  }
}

export class CreateChannelDto implements CreateChannelRequest {
  @IsIn(CHANNEL_TYPES, { message: `type must be one of ${CHANNEL_TYPES.join(', ')}` })
  type!: ChannelType

  /** An email address for EMAIL, a URL (such as a Slack incoming webhook) for WEBHOOK. */
  @Transform(trim)
  @IsString()
  @MaxLength(MONITOR_LIMITS.urlMaxLength)
  @Validate(MatchesChannelType)
  target!: string

  @IsOptional()
  @IsBoolean()
  sendOnDown?: boolean

  @IsOptional()
  @IsBoolean()
  sendOnRecover?: boolean
}

// The type cannot change: the target is checked against the channel's type in
// the service, since it is not part of this request.
export class UpdateChannelDto implements UpdateChannelRequest {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(MONITOR_LIMITS.urlMaxLength)
  target?: string

  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @IsOptional()
  @IsBoolean()
  sendOnDown?: boolean

  @IsOptional()
  @IsBoolean()
  sendOnRecover?: boolean
}

export class ChannelDto implements ChannelResponse {
  id!: number
  type!: ChannelType
  target!: string
  enabled!: boolean
  sendOnDown!: boolean
  sendOnRecover!: boolean
  /** Webhook channels only. Verify each delivery's X-Uptime-Signature with it. */
  signingSecret!: string | null
  /** ISO 8601 */
  createdAt!: string
}

export class ChannelTestResultDto implements ChannelTestResult {
  delivered!: boolean
  /** The receiver's HTTP status, for webhooks. */
  statusCode!: number | null
  error!: string | null
}
