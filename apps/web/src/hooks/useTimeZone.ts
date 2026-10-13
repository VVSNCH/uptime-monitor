import { useSyncExternalStore } from 'react'

import type { TimeZoneMode } from '../constants/time'
import { timeZonePreference } from '../services/preferences'

export function useTimeZone(): [TimeZoneMode, (mode: TimeZoneMode) => void] {
  const mode = useSyncExternalStore(timeZonePreference.subscribe, timeZonePreference.get)
  return [mode, timeZonePreference.set]
}
