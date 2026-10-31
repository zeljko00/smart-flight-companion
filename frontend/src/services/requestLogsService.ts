import { apiRequest, apiRequestBlob } from './apiClient'

type ApiRequestLog = {
  id?: string
  ipAddress?: string
  httpMethod?: string
  path?: string
  receivedAt?: string
  statusCode?: number | null
}

type ApiRequestLogPage = {
  items?: ApiRequestLog[]
  page?: number
  pageSize?: number
  totalCount?: number
  hasNextPage?: boolean
}

export type RequestLogEntry = {
  id: string
  ipAddress: string
  httpMethod: string
  path: string
  receivedAt: string
  statusCode: number | null
}

export type RequestLogPage = {
  items: RequestLogEntry[]
  page: number
  pageSize: number
  totalCount: number
  hasNextPage: boolean
}

export type RequestLogQuery = {
  page: number
  pageSize: number
  from?: Date
  to?: Date
}

export type RequestLogWindow = {
  from?: Date
  to?: Date
}

function toEntry(item: ApiRequestLog): RequestLogEntry {
  return {
    id: item.id ?? crypto.randomUUID(),
    ipAddress: item.ipAddress ?? '',
    httpMethod: item.httpMethod ?? '',
    path: item.path ?? '',
    receivedAt: item.receivedAt ?? '',
    statusCode: typeof item.statusCode === 'number' ? item.statusCode : null,
  }
}

function buildWindowParams(from?: Date, to?: Date): URLSearchParams {
  const params = new URLSearchParams()

  if (from) {
    params.set('from', from.toISOString())
  }

  if (to) {
    params.set('to', to.toISOString())
  }

  return params
}

export const requestLogsService = {
  async getPaged(query: RequestLogQuery, signal?: AbortSignal): Promise<RequestLogPage> {
    const params = buildWindowParams(query.from, query.to)
    params.set('page', String(query.page))
    params.set('pageSize', String(query.pageSize))

    const response = await apiRequest<ApiRequestLogPage>(`/logs?${params.toString()}`, {
      method: 'GET',
      signal,
    })

    return {
      items: (response.items ?? []).map(toEntry),
      page: response.page ?? query.page,
      pageSize: response.pageSize ?? query.pageSize,
      totalCount: response.totalCount ?? 0,
      hasNextPage: response.hasNextPage ?? false,
    }
  },

  downloadPdf({ from, to }: RequestLogWindow): Promise<Blob> {
    const params = buildWindowParams(from, to)

    return apiRequestBlob(`/logs/pdf?${params.toString()}`, {
      method: 'GET',
    })
  },
}
