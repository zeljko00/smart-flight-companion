import { apiRequest } from './apiClient'

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
  createdAt: string
}

export const authService = {
  login(payload: LoginRequest) {
    return apiRequest<UserDto>('/users/login', {
      method: 'POST',
      body: payload,
    })
  },
  register(payload: RegisterRequest) {
    return apiRequest<UserDto>('/users/', {
      method: 'POST',
      body: payload,
    })
  },
}
