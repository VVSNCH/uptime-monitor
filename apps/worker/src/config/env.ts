import { z } from 'zod'

const envSchema = z.object({
  WORKER_PORT: z.coerce.number().int().positive().default(3002),
  WORKER_HOST: z.string().min(1).default('localhost'),
  DATABASE_URL: z.url(),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(10),
  REDIS_URL: z.url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  ALLOW_PRIVATE_TARGETS: z.stringbool().default(false),
  CHECK_CONCURRENCY: z.coerce.number().int().positive().default(20),
  SMTP_URL: z.preprocess((value) => (value === '' ? undefined : value), z.url().optional()),
  ALERT_FROM_EMAIL: z.email().default('alerts@uptime.local'),
  APP_PUBLIC_URL: z.url().default('http://localhost:5000'),
  // At least a week, well past how far back the rollup looks, so no day is
  // pruned before it has been counted.
  RAW_CHECK_RETENTION_DAYS: z.coerce.number().int().min(7).default(30),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}
