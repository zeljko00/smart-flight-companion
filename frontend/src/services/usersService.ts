import { apiRequest } from './apiClient'
import type { UserDto } from './authService'

export type UserActivityDto = {
  at: string
  activeUsersCount: number | null
}

export const usersService = {
  getAll() {
    return apiRequest<UserDto[]>('/users', {
      method: 'GET',
    })
  },
  getActiveUsersCount() {
    return apiRequest<number>('/users/active', {
      method: 'GET',
    })
  },
  getUserActivity(from: Date) {
    const query = new URLSearchParams({ from: from.toISOString() })

    return apiRequest<UserActivityDto[]>(`/users/activity?${query.toString()}`, {
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
