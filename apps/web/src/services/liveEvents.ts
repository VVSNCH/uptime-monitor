import { LIVE_EVENT_TYPES, type LiveEvent } from '@uptime/shared'

import { API_ENDPOINTS, API_URL, LIVE_STREAM } from '../constants/api'
import { parseEventStream } from './eventStream'
import { refreshSession } from './http'
import { session } from './session'

export type LiveStatus = 'connecting' | 'live' | 'offline'

interface LiveHandlers {
  onEvent: (event: LiveEvent) => void
  onStatusChange: (status: LiveStatus) => void
}

const EVENT_TYPES = new Set<string>(Object.values(LIVE_EVENT_TYPES))

// fetch rather than the axios client or EventSource: axios cannot read a
// response as it streams in a browser, and EventSource cannot send the
// Authorization header. Reconnects with a growing delay until closed.
export function connectLiveEvents(handlers: LiveHandlers): () => void {
  let isClosed = false
  let controller: AbortController | null = null
  let retryDelayMs: number = LIVE_STREAM.retryDelayMs.min

  const run = async () => {
    while (!isClosed) {
      controller = new AbortController()
      handlers.onStatusChange('connecting')
      try {
        const isConnected = await listen(controller, handlers)
        if (isConnected) retryDelayMs = LIVE_STREAM.retryDelayMs.min
      } catch {
        // A dropped connection; retried below.
      }
      if (isClosed) return
      handlers.onStatusChange('offline')
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
      retryDelayMs = Math.min(retryDelayMs * 2, LIVE_STREAM.retryDelayMs.max)
    }
  }
  void run()

  return () => {
    isClosed = true
    controller?.abort()
  }
}

// Resolves when the stream ends; true if it was open for a while first.
async function listen(controller: AbortController, handlers: LiveHandlers): Promise<boolean> {
  const token = session.getAccessToken()
  const response = await fetch(`${API_URL}${API_ENDPOINTS.events}`, {
    headers: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: controller.signal,
  })

  // An expired token is renewed and the next attempt uses the new one.
  if (response.status === 401) {
    const renewed = await refreshSession().catch(() => undefined)
    if (renewed === null) session.expire()
    return Boolean(renewed)
  }
  if (!response.ok || !response.body) return false

  handlers.onStatusChange('live')
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  let watchdog = setTimeout(() => controller.abort(), LIVE_STREAM.silenceTimeoutMs)

  try {
    for (;;) {
      const { value, done: isDone } = await reader.read()
      if (isDone) return true
      clearTimeout(watchdog)
      watchdog = setTimeout(() => controller.abort(), LIVE_STREAM.silenceTimeoutMs)

      const { messages, rest } = parseEventStream(buffer + value)
      buffer = rest
      for (const message of messages) {
        if (!EVENT_TYPES.has(message.type)) continue
        handlers.onEvent(JSON.parse(message.data) as LiveEvent)
      }
    }
  } finally {
    clearTimeout(watchdog)
  }
}
