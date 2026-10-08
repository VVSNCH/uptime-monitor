import { existsSync, readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

// Jest hands each test file its own copy of process.env, which
// process.loadEnvFile does not write to, so values are copied in by hand.
const rootEnv = new URL('../../.env', import.meta.url)
if (existsSync(rootEnv)) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync(rootEnv, 'utf8')))) {
    process.env[key] ??= value
  }
}
