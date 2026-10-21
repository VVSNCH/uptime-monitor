import { describe, expect, it } from 'vitest'

import { parseEventStream } from './eventStream'

describe('parseEventStream', () => {
  it('reads named events and their data', () => {
    const text = 'event: monitor.checked\ndata: {"monitorId":4}\n\nevent: ping\ndata: {}\n\n'

    expect(parseEventStream(text)).toEqual({
      messages: [
        { type: 'monitor.checked', data: '{"monitorId":4}' },
        { type: 'ping', data: '{}' },
      ],
      rest: '',
    })
  })

  it('keeps an event that has not finished arriving for the next read', () => {
    const first = parseEventStream('event: monitor.checked\ndata: {"monitor')

    expect(first.messages).toEqual([])
    expect(parseEventStream(`${first.rest}Id":4}\n\n`).messages).toEqual([
      { type: 'monitor.checked', data: '{"monitorId":4}' },
    ])
  })

  it('accepts Windows line endings and skips comments', () => {
    const text = ': keep-alive\r\n\r\nid: 1\r\ndata: hello\r\n\r\n'

    expect(parseEventStream(text).messages).toEqual([{ type: 'message', data: 'hello' }])
  })

  it('joins data spread over several lines', () => {
    expect(parseEventStream('data: one\ndata: two\n\n').messages[0]?.data).toBe('one\ntwo')
  })
})
