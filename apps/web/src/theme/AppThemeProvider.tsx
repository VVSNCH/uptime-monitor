import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

import { theme } from './theme'

interface AppThemeProviderProps {
  children: ReactNode
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
  return (
    <ThemeProvider theme={theme}>
      <StyledThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </StyledThemeProvider>
    </ThemeProvider>
  )
}
