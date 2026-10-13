import { ALLOWED_URL_PROTOCOLS, MONITOR_LIMITS, PASSWORD_RULES } from '@uptime/shared'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Each answer says what is wrong, not just that something is.
export function validateUrl(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed === '') return 'Enter the URL to check'
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) {
    return 'Start the URL with http:// or https://'
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return 'This is not a valid URL'
  }
  if (!ALLOWED_URL_PROTOCOLS.some((protocol) => protocol === url.protocol)) {
    return `Only http and https can be checked, not ${url.protocol.replace(':', '')}`
  }
  if (url.hostname === '') return 'The URL needs a host name'
  if (trimmed.length > MONITOR_LIMITS.urlMaxLength) {
    return `Keep the URL under ${MONITOR_LIMITS.urlMaxLength} characters`
  }
  return null
}

export function validateName(value: string): string | null {
  if (value.trim() === '') return 'Give the monitor a name'
  if (value.length > MONITOR_LIMITS.nameMaxLength) {
    return `Keep the name under ${MONITOR_LIMITS.nameMaxLength} characters`
  }
  return null
}

export function validateTimeout(value: string): string | null {
  const { min, max } = MONITOR_LIMITS.timeoutMs
  const timeout = Number(value)
  if (!Number.isInteger(timeout) || timeout < min || timeout > max) {
    return `Use a whole number of milliseconds from ${min} to ${max}`
  }
  return null
}

export function validateExpectedStatus(value: string): string | null {
  if (value.trim() === '') return null
  const { min, max } = MONITOR_LIMITS.expectedStatus
  const status = Number(value)
  if (!Number.isInteger(status) || status < min || status > max) {
    return `Use an HTTP status from ${min} to ${max}, or leave it empty for any 2xx`
  }
  return null
}

export function validateEmail(value: string): string | null {
  if (value.trim() === '') return 'Enter your email address'
  return EMAIL_PATTERN.test(value.trim()) ? null : 'This does not look like an email address'
}

export function validateNewPassword(value: string): string | null {
  if (value.length < PASSWORD_RULES.minLength) {
    return `Use at least ${PASSWORD_RULES.minLength} characters`
  }
  if (value.length > PASSWORD_RULES.maxLength) {
    return `Keep it under ${PASSWORD_RULES.maxLength} characters`
  }
  return null
}
