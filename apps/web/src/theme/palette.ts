import type { DisplayStatus } from '../constants/status'

export const lightStatus: Record<DisplayStatus, string> = {
  up: '#1a7f37',
  down: '#cf222e',
  paused: '#6e7781',
  pending: '#9a6700',
  unknown: '#8250df',
}

export const darkStatus: Record<DisplayStatus, string> = {
  up: '#3fb950',
  down: '#f85149',
  paused: '#8b949e',
  pending: '#d29922',
  unknown: '#bc8cff',
}
