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

type ValidationProblem = {
  title?: string
  errors?: Record<string, string[]>
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

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const headers = new Headers(options.headers)

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
    body:
      options.body === undefined
        ? undefined
        : typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body),
  })

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
