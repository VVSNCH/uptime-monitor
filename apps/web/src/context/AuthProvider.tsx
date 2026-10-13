import { useQueryClient } from '@tanstack/react-query'
import type { AuthResponse, UserResponse } from '@uptime/shared'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { API_ENDPOINTS } from '../constants/api'
import { api, refreshSession } from '../services/http'
import { session } from '../services/session'
import { AuthContext, type AuthState, type AuthStatus } from './authContext'

interface AuthProviderProps {
  children: ReactNode
}

interface SessionState {
  status: AuthStatus
  user: UserResponse | null
}

const SIGNED_OUT: SessionState = { status: 'signedOut', user: null }

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<SessionState>({ status: 'loading', user: null })

  const restore = useCallback(() => {
    refreshSession()
      .then((response) =>
        setState(response ? { status: 'signedIn', user: response.user } : SIGNED_OUT),
      )
      .catch(() => setState({ status: 'unavailable', user: null }))
  }, [])

  useEffect(restore, [restore])

  // Cached data belongs to the user who fetched it, so it goes with them.
  useEffect(
    () =>
      session.onExpired(() => {
        queryClient.clear()
        setState(SIGNED_OUT)
      }),
    [queryClient],
  )

  const value = useMemo<AuthState>(
    () => ({
      ...state,
      signIn: (response: AuthResponse) => {
        session.setAccessToken(response.accessToken)
        setState({ status: 'signedIn', user: response.user })
      },
      signOut: async () => {
        await api.post(API_ENDPOINTS.logout).catch(() => undefined)
        session.setAccessToken(null)
        queryClient.clear()
        setState(SIGNED_OUT)
      },
      retry: () => {
        setState({ status: 'loading', user: null })
        restore()
      },
    }),
    [state, queryClient, restore],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
