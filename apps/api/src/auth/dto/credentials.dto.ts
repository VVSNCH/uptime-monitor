import {
  type ChangePasswordRequest,
  type LoginRequest,
  PASSWORD_RULES,
  type RegisterRequest,
} from '@uptime/shared'
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator'

const EMAIL_MAX_LENGTH = 254

export class RegisterDto implements RegisterRequest {
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email!: string

  @IsString()
  @MinLength(PASSWORD_RULES.minLength)
  @MaxLength(PASSWORD_RULES.maxLength)
  password!: string
}

// No minimum length on login: the rule is enforced when a password is set,
// and repeating it here would only tell an attacker what the rule is.
export class LoginDto implements LoginRequest {
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email!: string

  @IsString()
  @MaxLength(PASSWORD_RULES.maxLength)
  password!: string
}

export class ChangePasswordDto implements ChangePasswordRequest {
  @IsString()
  @MaxLength(PASSWORD_RULES.maxLength)
  currentPassword!: string

  @IsString()
  @MinLength(PASSWORD_RULES.minLength)
  @MaxLength(PASSWORD_RULES.maxLength)
  newPassword!: string
}
