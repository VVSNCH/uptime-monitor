import type { SvgIconComponent } from '@mui/icons-material'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'
import LightModeRounded from '@mui/icons-material/LightModeRounded'
import SettingsBrightnessRounded from '@mui/icons-material/SettingsBrightnessRounded'

export const THEME_MODE_ORDER = ['light', 'dark', 'system'] as const

export type ThemeMode = (typeof THEME_MODE_ORDER)[number]

export const THEME_MODES: Record<ThemeMode, { label: string; icon: SvgIconComponent }> = {
  light: { label: 'Light', icon: LightModeRounded },
  dark: { label: 'Dark', icon: DarkModeRounded },
  system: { label: 'System', icon: SettingsBrightnessRounded },
}
