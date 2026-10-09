import { BlockedUrlError } from './url-guard.service.js'

const NETWORK_ERRORS: Record<string, string> = {
  ENOTFOUND: 'DNS lookup failed',
  EAI_AGAIN: 'DNS lookup failed',
  ECONNREFUSED: 'Connection refused',
  ECONNRESET: 'Connection reset',
  EHOSTUNREACH: 'Host unreachable',
  ENETUNREACH: 'Network unreachable',
  UND_ERR_SOCKET: 'Connection closed unexpectedly',
}

interface ErrorLike {
  name?: unknown
  message?: unknown
  code?: unknown
  cause?: unknown
}

// Errors from undici and DOMException may come from another realm, where
// instanceof Error is false, so they are matched by shape.
function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null
}

// Turns whatever an outbound request threw into a sentence a user can act on.
export function describeRequestError(error: unknown, timeoutMs: number): string {
  for (let current = error; isErrorLike(current); current = current.cause) {
    if (current instanceof BlockedUrlError) return current.message
    if (current.name === 'TimeoutError') return `Timed out after ${timeoutMs} ms`

    const code = typeof current.code === 'string' ? current.code : null
    if (code && NETWORK_ERRORS[code]) return NETWORK_ERRORS[code]
    if (code && (code.includes('CERT') || code.startsWith('ERR_TLS'))) {
      return `TLS error: ${code}`
    }
  }

  return isErrorLike(error) && typeof error.message === 'string' ? error.message : 'Request failed'
}
