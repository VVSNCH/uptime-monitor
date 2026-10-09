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

// Nightly, in UTC. The rollup runs first, so a day is counted before any of
// its checks can be pruned.
export const ROLLUP_SCHEDULER_ID = 'nightly-rollup'
export const ROLLUP_CRON = '5 0 * * *'
export const PRUNE_SCHEDULER_ID = 'nightly-prune'
export const PRUNE_CRON = '20 0 * * *'
export const ROLLUP_LOOKBACK_DAYS = 3
export const PRUNE_BATCH_SIZE = 10_000
export const FINISHED_ROLLUP_JOBS_KEPT = 30
