const QUEUE_OPERATION_TIMEOUT_MS = 2_000

// Before the first connection, BullMQ waits for Redis indefinitely. Every queue
// call from a request goes through this so the request gets an answer instead.
export function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs = QUEUE_OPERATION_TIMEOUT_MS,
  message = 'Timed out waiting for Redis',
): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  return Promise.race([operation, timeout]).finally(() => clearTimeout(timer))
}
