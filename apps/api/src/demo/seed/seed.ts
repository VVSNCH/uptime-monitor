import { existsSync } from 'node:fs'

import { hash } from '@node-rs/argon2'
import { createPrismaClient } from '@uptime/database'
import { DEMO_ACCOUNT, UPTIME_HISTORY_DAYS } from '@uptime/shared'
import { z } from 'zod'

import { DEMO_TARGET_MONITOR, SEED_PROFILES, SEED_RANDOM_BASE } from './demo-monitors.js'
import { createRandom, generateHistory } from './seed-history.js'

// Writes in one transaction, which takes a few seconds for 90 days of history.
const TRANSACTION_TIMEOUT_MS = 60_000

const envSchema = z.object({
  DATABASE_URL: z.url(),
  DEMO_SEED_ENABLED: z.stringbool().default(false),
  DEMO_TARGET_URL: z.url().default('http://localhost:3000/api/v1/demo/target'),
})

for (const path of ['.env', '../../.env']) {
  if (existsSync(path)) {
    process.loadEnvFile(path)
    break
  }
}

const env = envSchema.parse(process.env)
// Replaces the demo account wholesale, so it has to be asked for.
if (!env.DEMO_SEED_ENABLED) {
  process.stderr.write('Refusing to seed: set DEMO_SEED_ENABLED=true to replace the demo account\n')
  process.exit(1)
}

const prisma = createPrismaClient(env.DATABASE_URL)
const now = new Date()

try {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_ACCOUNT.email } })
  if (existing && !existing.isDemo) {
    throw new Error(`${DEMO_ACCOUNT.email} belongs to a real account, so it was left alone`)
  }
  const passwordHash = await hash(DEMO_ACCOUNT.password)

  const summary = await prisma.$transaction(
    async (tx) => {
      if (existing) await tx.user.delete({ where: { id: existing.id } })
      const user = await tx.user.create({
        data: { email: DEMO_ACCOUNT.email, passwordHash, isDemo: true },
      })

      const lines: string[] = []
      for (const [index, profile] of SEED_PROFILES.entries()) {
        const random = createRandom(SEED_RANDOM_BASE + index)
        const history = generateHistory(profile, now, random, UPTIME_HISTORY_DAYS)
        const monitor = await tx.monitor.create({
          data: {
            userId: user.id,
            name: profile.name,
            url: profile.url,
            intervalSeconds: profile.intervalSeconds,
            isSeeded: true,
            status: history.status,
            consecutiveFailures: history.consecutiveFailures,
            lastCheckedAt: history.lastCheckedAt,
            lastResponseMs: history.lastResponseMs,
            createdAt: history.dailyStats[0]?.day ?? now,
          },
        })
        const monitorId = monitor.id
        await tx.dailyStat.createMany({
          data: history.dailyStats.map((day) => ({ monitorId, ...day })),
        })
        await tx.check.createMany({
          data: history.checks.map((check) => ({ monitorId, ...check })),
        })
        await tx.incident.createMany({
          data: history.incidents.map((incident) => ({ monitorId, ...incident })),
        })
        lines.push(
          `  ${profile.name}: ${history.dailyStats.length} days, ${history.checks.length} checks, ` +
            `${history.incidents.length} incident${history.incidents.length === 1 ? '' : 's'}, ` +
            `now ${history.status}`,
        )
      }

      await tx.monitor.create({
        data: { userId: user.id, url: env.DEMO_TARGET_URL, ...DEMO_TARGET_MONITOR },
      })
      lines.push(`  ${DEMO_TARGET_MONITOR.name}: live, ${env.DEMO_TARGET_URL}`)
      return lines
    },
    { timeout: TRANSACTION_TIMEOUT_MS },
  )

  process.stdout.write(
    `Seeded ${DEMO_ACCOUNT.email} (password ${DEMO_ACCOUNT.password}):\n${summary.join('\n')}\n` +
      'Restart the api, or wait for its next reconcile, to start checking these monitors.\n',
  )
} catch (error) {
  process.stderr.write(
    `Seeding failed: ${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
