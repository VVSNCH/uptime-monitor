export interface RegisterRequest {
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UserResponse {
  id: number
  email: string
  isDemo: boolean
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  expiresIn: number
  user: UserResponse
}
