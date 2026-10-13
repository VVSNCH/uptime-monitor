import { Navigate, Outlet, useLocation } from 'react-router'

import { ErrorState, LoadingState } from '../../components'
import { ROUTES } from '../../constants/navigation'
import { useAuth } from '../../hooks/useAuth'

export interface RedirectState {
  from?: string
}

export function RequireAuth() {
  const { status, retry } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LoadingState variant="page" />

  // Not the same as signed out: sending someone to sign in again would not help.
  if (status === 'unavailable') {
    return (
      <ErrorState
        title="Service unavailable"
        message="The dashboard cannot reach the server right now."
        onRetry={retry}
      />
    )
  }

  if (status === 'signedOut') {
    const state: RedirectState = { from: location.pathname }
    return <Navigate to={ROUTES.login} replace state={state} />
  }

  return <Outlet />
}
