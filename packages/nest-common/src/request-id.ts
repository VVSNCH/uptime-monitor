import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

export const REQUEST_ID_HEADER = 'x-request-id'

const MAX_REQUEST_ID_LENGTH = 128

// Reuses an incoming id so one request can be followed from the gateway into
// the api; anything missing or oversized is replaced rather than trusted.
export function resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers[REQUEST_ID_HEADER]
  const isUsable =
    typeof incoming === 'string' && incoming.length > 0 && incoming.length <= MAX_REQUEST_ID_LENGTH
  const id = isUsable ? incoming : randomUUID()

  req.headers[REQUEST_ID_HEADER] = id
  res.setHeader(REQUEST_ID_HEADER, id)
  return id
}
