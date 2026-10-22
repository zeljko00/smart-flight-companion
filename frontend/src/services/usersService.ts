import { apiRequest } from './apiClient'
import type { UserDto } from './authService'

export const usersService = {
  getAll() {
    return apiRequest<UserDto[]>('/users', {
      method: 'GET',
    })
  },
  authorize(id: string) {
    return apiRequest<void>(`/users/${id}/authorize`, {
      method: 'PUT',
    })
  },
  block(id: string) {
    return apiRequest<void>(`/users/${id}`, {
      method: 'PUT',
    })
  },
}
