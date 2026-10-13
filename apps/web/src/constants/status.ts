export const DISPLAY_STATUS = {
  up: 'up',
  down: 'down',
  paused: 'paused',
  pending: 'pending',
  unknown: 'unknown',
} as const

export type DisplayStatus = (typeof DISPLAY_STATUS)[keyof typeof DISPLAY_STATUS]

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  up: 'Up',
  down: 'Down',
  paused: 'Paused',
  pending: 'Waiting for first check',
  unknown: 'Unknown',
}
