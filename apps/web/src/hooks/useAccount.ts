import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
} from '@uptime/shared'

import { API_ENDPOINTS } from '../constants/api'
import { useApiMutation } from './useApiMutation'
import { useAuth } from './useAuth'

export function useLogin() {
  const { signIn } = useAuth()
  return useApiMutation<LoginRequest, AuthResponse>('post', API_ENDPOINTS.login, {
    onSuccess: signIn,
  })
}

export function useRegister() {
  const { signIn } = useAuth()
  return useApiMutation<RegisterRequest, AuthResponse>('post', API_ENDPOINTS.register, {
    onSuccess: signIn,
  })
}

// The api signs out every other session and hands this one a fresh token.
export function useChangePassword() {
  const { signIn } = useAuth()
  return useApiMutation<ChangePasswordRequest, AuthResponse>('patch', API_ENDPOINTS.password, {
    onSuccess: signIn,
  })
}

export function useSignOutEverywhere() {
  const { signOut } = useAuth()
  return useApiMutation('post', API_ENDPOINTS.logoutAll, { onSuccess: signOut })
}
