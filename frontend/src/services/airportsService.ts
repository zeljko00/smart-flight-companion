import { apiRequest } from './apiClient'

export type AirportDto = {
  id: string
  name: string
  iata: string
  city: string
  country: string
  address: string
  latitude: number
  longitude: number
  description: string
}

export type CreateAirportRequest = {
  name: string
  iata: string
  city: string
  country: string
  latitude: number
  longitude: number
  description?: string
}

export const airportsService = {
  getAll(signal?: AbortSignal) {
    return apiRequest<AirportDto[]>('/airports', {
      method: 'GET',
      signal,
    })
  },
  search(query: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ query })

    return apiRequest<AirportDto[]>(`/airports/search?${params.toString()}`, {
      method: 'GET',
      signal,
    })
  },
  create(request: CreateAirportRequest) {
    return apiRequest<AirportDto>('/airports', {
      method: 'POST',
      body: request,
    })
  },
}
