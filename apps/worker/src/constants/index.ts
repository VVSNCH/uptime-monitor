export const HEALTH_CHECK_TIMEOUT_MS = 2_000
export const MAX_REDIRECTS = 5
export const PROBE_USER_AGENT = 'UptimeMonitor/1.0'

export const WEBHOOK_TIMEOUT_MS = 10_000
export const EMAIL_TIMEOUT_MS = 10_000
export const DELIVERY_ATTEMPTS = 5
export const DELIVERY_BACKOFF_MS = 10_000
export const NOTIFY_ATTEMPTS = 3
// Finished notification jobs are kept this long so their ids keep blocking
// a second alert for the same status change.
export const NOTIFICATION_JOB_RETENTION_SECONDS = 7 * 24 * 60 * 60
