export const ERROR_CODES = {
  badRequest: 'BAD_REQUEST',
  validationFailed: 'VALIDATION_FAILED',
  unauthorized: 'UNAUTHORIZED',
  invalidCredentials: 'INVALID_CREDENTIALS',
  forbidden: 'FORBIDDEN',
  emailTaken: 'EMAIL_TAKEN',
  notFound: 'NOT_FOUND',
  conflict: 'CONFLICT',
  rateLimited: 'RATE_LIMITED',
  serviceUnavailable: 'SERVICE_UNAVAILABLE',
  upstreamUnreachable: 'UPSTREAM_UNREACHABLE',
  internal: 'INTERNAL_ERROR',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
