import { useColorScheme } from '@mui/material/styles'

import type { ThemeMode } from '../constants/appearance'

// MUI keeps the choice in this browser's storage. Before it has read it back
// the mode is undefined, which behaves like following the system.
export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  const { mode, setMode } = useColorScheme()
  return [mode ?? 'system', setMode]
}
