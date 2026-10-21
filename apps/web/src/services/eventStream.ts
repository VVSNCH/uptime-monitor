export interface StreamMessage {
  type: string
  data: string
}

// Splits text received so far into complete server-sent events. Whatever
// follows the last blank line is an event still arriving, returned as rest.
export function parseEventStream(text: string): { messages: StreamMessage[]; rest: string } {
  const blocks = text.replace(/\r\n?/g, '\n').split('\n\n')
  const rest = blocks.pop() ?? ''
  const messages: StreamMessage[] = []

  for (const block of blocks) {
    let type = 'message'
    const data: string[] = []
    for (const line of block.split('\n')) {
      if (line === '' || line.startsWith(':')) continue
      const separator = line.indexOf(':')
      const field = separator === -1 ? line : line.slice(0, separator)
      const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '')
      if (field === 'event') type = value
      if (field === 'data') data.push(value)
    }
    if (data.length > 0) messages.push({ type, data: data.join('\n') })
  }
  return { messages, rest }
}
