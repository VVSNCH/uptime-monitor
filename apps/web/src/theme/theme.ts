import { createTheme } from '@mui/material/styles'

import { darkStatus, lightStatus } from './palette'

// Schemes switch by a class on <html> rather than by the OS media query, so
// the user can choose one. "System" still follows the OS.
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#2563eb' },
        background: { default: '#f6f8fa', paper: '#ffffff' },
        status: lightStatus,
      },
    },
    dark: {
      palette: {
        primary: { main: '#60a5fa' },
        background: { default: '#0d1117', paper: '#161b22' },
        status: darkStatus,
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 700 },
    h2: { fontSize: '1.375rem', fontWeight: 700 },
    h3: { fontSize: '1.125rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
    },
    MuiTextField: {
      defaultProps: { size: 'small', fullWidth: true },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: ({ theme }) => ({ borderBottom: `1px solid ${theme.vars.palette.divider}` }),
      },
    },
    MuiDialog: {
      defaultProps: { fullWidth: true, maxWidth: 'xs' },
    },
    MuiChip: {
      styleOverrides: { label: { fontWeight: 600 } },
    },
  },
})
