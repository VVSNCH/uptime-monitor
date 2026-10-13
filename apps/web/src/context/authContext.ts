import type { AuthResponse, UserResponse } from '@uptime/shared'
import { createContext } from 'react'

// loading: asking the api whether the refresh cookie still holds a session.
// unavailable: the api could not be asked, which is not the same as signed out.
export type AuthStatus = 'loading' | 'signedIn' | 'signedOut' | 'unavailable'

export interface AuthState {
  status: AuthStatus
  user: UserResponse | null
  signIn: (response: AuthResponse) => void
  signOut: () => Promise<void>
  retry: () => void
}

export const AuthContext = createContext<AuthState | null>(null)
