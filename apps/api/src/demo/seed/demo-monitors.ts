import type { SeedProfile } from './seed-history.js'

// Reserved example domains only, so no real company's site is shown with an
// invented outage. The .invalid host can never resolve, which keeps its open
// incident open once real checks start.
export const SEED_PROFILES: readonly SeedProfile[] = [
  {
    name: 'Marketing site',
    url: 'https://example.com',
    intervalSeconds: 300,
    baseResponseMs: 180,
    incidentCount: 2,
    causes: ['HTTP 503', 'Timed out after 10000 ms'],
  },
  {
    name: 'Customer portal',
    url: 'https://example.org',
    intervalSeconds: 60,
    baseResponseMs: 240,
    incidentCount: 4,
    causes: ['HTTP 502', 'HTTP 500', 'Connection reset'],
  },
  {
    name: 'Public API',
    url: 'https://example.net',
    intervalSeconds: 300,
    baseResponseMs: 95,
    incidentCount: 1,
    causes: ['HTTP 504'],
  },
  {
    name: 'Legacy reports',
    url: 'https://reports.example.invalid',
    intervalSeconds: 900,
    baseResponseMs: 620,
    incidentCount: 5,
    openIncidentMinutes: 95,
    causes: ['DNS lookup failed', 'HTTP 500', 'Timed out after 10000 ms'],
  },
]

// Not seeded: it starts with no history and is checked for real, so it is
// the one to switch during a walkthrough.
export const DEMO_TARGET_MONITOR = {
  name: 'Demo target',
  intervalSeconds: 60,
} as const

// Fixed so every run produces the same shape of history.
export const SEED_RANDOM_BASE = 20_261_009
