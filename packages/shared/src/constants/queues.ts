export const QUEUE_NAMES = {
  checks: 'checks',
  notifications: 'notifications',
  rollup: 'rollup',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

export const JOB_NAMES = {
  check: 'check',
  notify: 'notify',
  deliver: 'deliver',
  testDelivery: 'test-delivery',
  rollup: 'rollup',
  pruneChecks: 'prune-checks',
} as const
