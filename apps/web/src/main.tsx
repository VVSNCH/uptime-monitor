import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { ErrorBoundary } from './components'
import { AuthProvider } from './context/AuthProvider'
import { SnackbarProvider } from './context/SnackbarProvider'
import { router } from './routes'
import { queryClient } from './services/queryClient'
import { AppThemeProvider } from './theme/AppThemeProvider'

const container = document.getElementById('root')
if (!container) throw new Error('Missing #root element')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <SnackbarProvider>
          <AuthProvider>
            <ErrorBoundary>
              <RouterProvider router={router} />
            </ErrorBoundary>
          </AuthProvider>
        </SnackbarProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
