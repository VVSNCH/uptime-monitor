import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const rootEnv = new URL('../../../.env', import.meta.url)
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const testUrl = process.env.TEST_DATABASE_URL
if (!testUrl) {
  process.stderr.write('TEST_DATABASE_URL is not set\n')
  process.exit(1)
}

const { status } = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DATABASE_URL: testUrl },
})
process.exit(status ?? 1)
