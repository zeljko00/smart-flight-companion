import { apiRequest } from './apiClient'
import { setAuthSession } from './authSession'

export type LoginRequest = {
  username: string
  password: string
}

export type RegisterRequest = {
  username: string
  email: string
  firstName: string
  lastName: string
  password: string
}

export type UserDto = {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  createdAt: string
}

type AuthenticationResultDto = {
  user: UserDto
  accessToken: string
  refreshToken: string
}

export const authService = {
  async login(payload: LoginRequest) {
    const response = await apiRequest<AuthenticationResultDto>('/auth/login', {
      method: 'POST',
      body: payload,
    })

    setAuthSession({
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    })

    return response.user
  },
  async register(payload: RegisterRequest) {
    const response = await apiRequest<AuthenticationResultDto>('/auth/register', {
      method: 'POST',
      body: payload,
    })

    setAuthSession({
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    })

    return response.user
  },
}
