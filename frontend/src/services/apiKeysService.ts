import { apiRequest } from './apiClient'

export type CreateApiKeyRequest = {
  name: string
}

export type ApiKeyResult = {
  key: string
  name: string
}

export const apiKeysService = {
  create(request: CreateApiKeyRequest) {
    return apiRequest<ApiKeyResult>('/api-keys', {
      method: 'POST',
      body: request,
    })
  },
}
