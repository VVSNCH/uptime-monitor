import { TIME_ZONE_MODES, TIME_ZONE_STORAGE_KEY, type TimeZoneMode } from '../constants/time'

type Listener = () => void

const listeners = new Set<Listener>()

// Storage can be unavailable (private windows, blocked site data), so every
// access falls back to the default instead of failing the page.
function read(): TimeZoneMode {
  try {
    const stored = localStorage.getItem(TIME_ZONE_STORAGE_KEY)
    return TIME_ZONE_MODES.find((mode) => mode === stored) ?? 'local'
  } catch {
    return 'local'
  }
}

let current = read()

export const timeZonePreference = {
  get: () => current,

  set: (mode: TimeZoneMode) => {
    current = mode
    try {
      localStorage.setItem(TIME_ZONE_STORAGE_KEY, mode)
    } catch {
      // Kept for this visit only.
    }
    for (const listener of listeners) listener()
  },

  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
