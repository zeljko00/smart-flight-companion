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
  resetPassword(id: string, language: 'en' | 'srb') {
    const query = new URLSearchParams({ language })

    return apiRequest<void>(`/users/${id}/reset?${query.toString()}`, {
      method: 'PUT',
    })
  },
}
