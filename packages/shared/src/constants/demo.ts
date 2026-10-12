// The seeded demo account. Its password is public on purpose: anyone trying
// the deployed app signs in with it.
export const DEMO_ACCOUNT = {
  email: 'demo@example.com',
  password: 'try-the-demo',
} as const

export const DEMO_TARGET_MODES = ['up', 'down', 'timeout', 'status'] as const

export type DemoTargetMode = (typeof DEMO_TARGET_MODES)[number]
