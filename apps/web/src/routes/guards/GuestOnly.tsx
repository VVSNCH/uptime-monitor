import { Navigate, Outlet, useLocation } from 'react-router'

import { LoadingState } from '../../components'
import { ROUTES } from '../../constants/navigation'
import { useAuth } from '../../hooks/useAuth'
import type { RedirectState } from './RequireAuth'

// Signing in sends the user back to the page that asked them to.
export function GuestOnly() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LoadingState variant="page" />
  if (status === 'signedIn') {
    const state = location.state as RedirectState | null
    return <Navigate to={state?.from ?? ROUTES.monitors} replace />
  }
  return <Outlet />
}
