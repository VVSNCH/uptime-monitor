import type { DisplayStatus } from '../constants/status'

declare module '@mui/material/styles' {
  interface CssThemeVariables {
    enabled: true
  }
  interface Palette {
    status: Record<DisplayStatus, string>
  }
  interface PaletteOptions {
    status?: Record<DisplayStatus, string>
  }
}
