import { clearAuthSession, getAccessToken, getRefreshToken, setAuthSession } from './authSession'
import type { UserDto } from './authService'

export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const UNAUTHORIZED_STATUS = 401

type AuthenticationResultDto = {
  user: UserDto
  accessToken: string
  refreshToken: string
}

let refreshInFlight: Promise<boolean> | null = null

type ValidationProblem = {
  title?: string
  errors?: Record<string, string[]>
}

function forceLogout(): void {
  clearAuthSession()

  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    window.location.replace('/')
  }
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    if ('message' in payload && typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message
    }

    const validationPayload = payload as ValidationProblem
    const firstValidationError = validationPayload.errors
      ? Object.values(validationPayload.errors).flat().find((value) => value.trim())
      : undefined

    if (firstValidationError) {
      return firstValidationError
    }

    if (typeof validationPayload.title === 'string' && validationPayload.title.trim()) {
      return validationPayload.title
    }
  }

  return `Request failed with status ${status}`
}

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

function shouldAttemptRefresh(path: string): boolean {
  const normalizedPath = path.toLowerCase()
  return normalizedPath !== '/auth/login'
    && normalizedPath !== '/auth/register'
    && normalizedPath !== '/auth/refresh'
}

function isAuthenticationResultDto(payload: unknown): payload is AuthenticationResultDto {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const value = payload as Record<string, unknown>

  return typeof value.accessToken === 'string'
    && value.accessToken.trim().length > 0
    && typeof value.refreshToken === 'string'
    && value.refreshToken.trim().length > 0
    && typeof value.user === 'object'
    && value.user !== null
}

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return false
  }

  const response = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  })

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json') || contentType.includes('+json')
  const payload = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok || !isAuthenticationResultDto(payload)) {
    forceLogout()
    return false
  }

  setAuthSession({
    user: payload.user,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  })

  return true
}

async function refreshSession(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    try {
      return await performRefresh()
    } catch {
      forceLogout()
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

function buildRequestBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined
  }

  return typeof body === 'string' ? body : JSON.stringify(body)
}

async function sendRequest(
  path: string,
  options: RequestOptions,
  retryOnUnauthorized: boolean,
): Promise<Response> {
  const headers = new Headers(options.headers)

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const accessToken = getAccessToken()
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
    body: buildRequestBody(options.body),
  })

  if (
    response.status === UNAUTHORIZED_STATUS
    && retryOnUnauthorized
    && shouldAttemptRefresh(path)
    && (await refreshSession())
  ) {
    return await sendRequest(path, options, false)
  }

  return response
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const response = await sendRequest(path, options, true)

  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json') || contentType.includes('+json')

  const payload = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '')

  if (!response.ok) {
    const messageFromPayload = extractErrorMessage(payload, response.status)

    throw new ApiError(messageFromPayload, response.status, payload)
  }

  return payload as TResponse
}

export async function apiRequestBlob(
  path: string,
  options: RequestOptions = {},
): Promise<Blob> {
  const response = await sendRequest(path, options, true)

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    const isJson = contentType.includes('application/json') || contentType.includes('+json')

    const payload = isJson
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '')

    throw new ApiError(extractErrorMessage(payload, response.status), response.status, payload)
  }

  return await response.blob()
}
