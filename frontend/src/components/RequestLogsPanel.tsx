import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Loader2, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../services/apiClient'
import {
  requestLogsService,
  type AiLogPage,
  type RequestLogPage,
} from '../services/requestLogsService'
import '../style/RequestLogsPanel.css'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const DEFAULT_PAGE_SIZE = 20

// datetime-local inputs have minute precision; the "to" bound covers the whole selected minute.
const END_OF_MINUTE_MS = 59_999

function parseDateTimeInput(value: string, endOfMinute = false): Date | undefined {
  if (!value) {
    return undefined
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return endOfMinute ? new Date(parsed.getTime() + END_OF_MINUTE_MS) : parsed
}

function getMethodClassName(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'request-logs__method--get'
    case 'POST':
      return 'request-logs__method--post'
    case 'PUT':
    case 'PATCH':
      return 'request-logs__method--put'
    case 'DELETE':
      return 'request-logs__method--delete'
    default:
      return ''
  }
}

function getStatusClassName(statusCode: number | null): string {
  if (statusCode === null) {
    return 'request-logs__status--pending'
  }

  if (statusCode >= 500) {
    return 'request-logs__status--error'
  }

  if (statusCode >= 400) {
    return 'request-logs__status--warning'
  }

  return 'request-logs__status--success'
}

function removeNullFields(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined
  }

  if (Array.isArray(value)) {
    const filtered = value
      .map((item) => removeNullFields(item))
      .filter((item) => item !== undefined)

    return filtered.length > 0 ? filtered : undefined
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, removeNullFields(item)] as const)
      .filter(([, item]) => item !== undefined)

    return entries.length > 0 ? Object.fromEntries(entries) : undefined
  }

  return value
}

type AiResponseLine = {
  key: string
  value: string
}

function flattenResponseAttributes(value: unknown, prefix = ''): AiResponseLine[] {
  if (value === null || value === undefined) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenResponseAttributes(item, `${prefix}[${index}]`))
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key
      return flattenResponseAttributes(item, nextPrefix)
    })
  }

  if (typeof value === 'string') {
    return [{ key: prefix || 'value', value }]
  }

  return [{ key: prefix || 'value', value: String(value) }]
}

function formatAiResponse(value: string): AiResponseLine[] {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return [{ key: '-', value: '-' }]
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    const filtered = removeNullFields(parsed)

    if (filtered === undefined) {
      return [{ key: '-', value: '-' }]
    }

    const lines = flattenResponseAttributes(filtered)
    return lines.length > 0 ? lines : [{ key: '-', value: '-' }]
  } catch {
    return [{ key: 'raw', value }]
  }
}

export function RequestLogsPanel() {
  const { t, i18n } = useTranslation()
  const [fromValue, setFromValue] = useState('')
  const [toValue, setToValue] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<RequestLogPage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadErrorMessage, setDownloadErrorMessage] = useState<string | null>(null)
  const [aiPage, setAiPage] = useState(1)
  const [aiPageSize, setAiPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [aiReloadToken, setAiReloadToken] = useState(0)
  const [aiResult, setAiResult] = useState<AiLogPage | null>(null)
  const [isAiLoading, setIsAiLoading] = useState(true)
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null)

  const fromMs = useMemo(() => parseDateTimeInput(fromValue)?.getTime(), [fromValue])
  const toMs = useMemo(() => parseDateTimeInput(toValue, true)?.getTime(), [toValue])
  const isRangeInvalid = fromMs !== undefined && toMs !== undefined && fromMs > toMs

  useEffect(() => {
    if (isRangeInvalid) {
      return
    }

    const controller = new AbortController()

    void (async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await requestLogsService.getPaged(
          {
            page,
            pageSize,
            from: fromMs === undefined ? undefined : new Date(fromMs),
            to: toMs === undefined ? undefined : new Date(toMs),
          },
          controller.signal,
        )

        if (!controller.signal.aborted) {
          setResult(response)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(error instanceof ApiError ? error.message : t('admin.requestLogs.loadError'))
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      controller.abort()
    }
  }, [fromMs, isRangeInvalid, page, pageSize, reloadToken, t, toMs])

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setIsAiLoading(true)
      setAiErrorMessage(null)

      try {
        const response = await requestLogsService.getAiPaged(
          {
            page: aiPage,
            pageSize: aiPageSize,
          },
          controller.signal,
        )

        if (!controller.signal.aborted) {
          setAiResult(response)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setAiErrorMessage(error instanceof ApiError ? error.message : t('admin.requestLogs.ai.loadError'))
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsAiLoading(false)
        }
      }
    })()

    return () => {
      controller.abort()
    }
  }, [aiPage, aiPageSize, aiReloadToken, t])

  const formatTimestamp = (value: string) => {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(parsed)
  }

  const handleFromChange = (value: string) => {
    setFromValue(value)
    setPage(1)
  }

  const handleToChange = (value: string) => {
    setToValue(value)
    setPage(1)
  }

  const handleClearFilters = () => {
    setFromValue('')
    setToValue('')
    setPage(1)
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value))
    setPage(1)
  }

  const handleAiPageSizeChange = (value: string) => {
    setAiPageSize(Number(value))
    setAiPage(1)
  }

  const handleDownloadPdf = async () => {
    if (isRangeInvalid) {
      return
    }

    setDownloadErrorMessage(null)
    setIsDownloading(true)

    try {
      const pdfBlob = await requestLogsService.downloadPdf({
        from: fromMs === undefined ? undefined : new Date(fromMs),
        to: toMs === undefined ? undefined : new Date(toMs),
      })

      const objectUrl = window.URL.createObjectURL(pdfBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = objectUrl
      downloadLink.download = `request-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.pdf`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (error) {
      setDownloadErrorMessage(error instanceof ApiError ? error.message : t('admin.requestLogs.downloadError'))
    } finally {
      setIsDownloading(false)
    }
  }

  const totalCount = result?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const items = result?.items ?? []
  const hasFilters = fromValue !== '' || toValue !== ''
  const aiTotalCount = aiResult?.totalCount ?? 0
  const aiTotalPages = Math.max(1, Math.ceil(aiTotalCount / aiPageSize))
  const aiItems = aiResult?.items ?? []

  return (
    <section className="request-logs" aria-label={t('admin.requestLogs.aria')}>
      <div className="request-logs__toolbar">
        <div className="request-logs__filters" role="group" aria-label={t('admin.requestLogs.filtersAria')}>
          <label className="request-logs__field">
            <span>{t('admin.requestLogs.from')}</span>
            <input
              type="datetime-local"
              value={fromValue}
              max={toValue || undefined}
              onChange={(event) => handleFromChange(event.target.value)}
            />
          </label>

          <label className="request-logs__field">
            <span>{t('admin.requestLogs.to')}</span>
            <input
              type="datetime-local"
              value={toValue}
              min={fromValue || undefined}
              onChange={(event) => handleToChange(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="request-logs__button request-logs__button--ghost"
            onClick={handleClearFilters}
            disabled={!hasFilters}
          >
            <X size={14} aria-hidden="true" />
            <span>{t('admin.requestLogs.clear')}</span>
          </button>
        </div>

        <div className="request-logs__actions">
          <button
            type="button"
            className="request-logs__button request-logs__button--secondary"
            onClick={() => setReloadToken((current) => current + 1)}
            disabled={isLoading || isRangeInvalid}
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>{t('admin.requestLogs.refresh')}</span>
          </button>

          <button
            type="button"
            className="request-logs__button request-logs__button--primary"
            onClick={() => {
              void handleDownloadPdf()
            }}
            disabled={isDownloading || isRangeInvalid}
          >
            {isDownloading ? (
              <Loader2 size={14} className="request-logs__spinner" aria-hidden="true" />
            ) : (
              <Download size={14} aria-hidden="true" />
            )}
            <span>{isDownloading ? t('admin.requestLogs.downloading') : t('admin.requestLogs.downloadPdf')}</span>
          </button>
        </div>
      </div>

      {isRangeInvalid ? (
        <p className="request-logs__message request-logs__message--error" role="alert">
          {t('admin.requestLogs.invalidRange')}
        </p>
      ) : null}

      {downloadErrorMessage ? (
        <p className="request-logs__message request-logs__message--error" role="alert">
          {downloadErrorMessage}
        </p>
      ) : null}

      {!isRangeInvalid && isLoading && !result ? (
        <p className="request-logs__message">{t('admin.requestLogs.loading')}</p>
      ) : null}

      {!isRangeInvalid && errorMessage ? (
        <p className="request-logs__message request-logs__message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {!isRangeInvalid && !errorMessage && result && items.length === 0 && !isLoading ? (
        <p className="request-logs__message">{t('admin.requestLogs.empty')}</p>
      ) : null}

      {!isRangeInvalid && !errorMessage && items.length > 0 ? (
        <div
          className={`request-logs__table-wrap ${isLoading ? 'request-logs__table-wrap--loading' : ''}`}
          aria-busy={isLoading}
        >
          <table className="request-logs__table" aria-label={t('admin.requestLogs.tableAria')}>
            <thead>
              <tr>
                <th>{t('admin.requestLogs.columns.receivedAt')}</th>
                <th>{t('admin.requestLogs.columns.ipAddress')}</th>
                <th>{t('admin.requestLogs.columns.method')}</th>
                <th>{t('admin.requestLogs.columns.path')}</th>
                <th>{t('admin.requestLogs.columns.userId')}</th>
                <th>{t('admin.requestLogs.columns.result')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => (
                <tr key={entry.id}>
                  <td className="request-logs__cell-time">{formatTimestamp(entry.receivedAt)}</td>
                  <td className="request-logs__cell-ip">{entry.ipAddress}</td>
                  <td>
                    <span className={`request-logs__method ${getMethodClassName(entry.httpMethod)}`}>
                      {entry.httpMethod}
                    </span>
                  </td>
                  <td className="request-logs__cell-path">{entry.path}</td>
                  <td className="request-logs__cell-userid">{entry.userId ?? '-'}</td>
                  <td>
                    <span className={`request-logs__status ${getStatusClassName(entry.statusCode)}`}>
                      {entry.statusCode ?? t('admin.requestLogs.pending')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!errorMessage && !isRangeInvalid ? (
        <div className="request-logs__pagination" aria-label={t('admin.requestLogs.pagination.aria')}>
          <button
            type="button"
            className="request-logs__button request-logs__button--secondary"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={isLoading || page <= 1}
          >
            <ChevronLeft size={14} aria-hidden="true" />
            <span>{t('admin.requestLogs.pagination.previous')}</span>
          </button>

          <span className="request-logs__pagination-label" aria-live="polite">
            {t('admin.requestLogs.pagination.page', { page, total: totalPages })}
          </span>

          <button
            type="button"
            className="request-logs__button request-logs__button--secondary"
            onClick={() => setPage((current) => current + 1)}
            disabled={isLoading || !result?.hasNextPage}
          >
            <span>{t('admin.requestLogs.pagination.next')}</span>
            <ChevronRight size={14} aria-hidden="true" />
          </button>

          <span className="request-logs__total">
            {t('admin.requestLogs.pagination.total', { count: totalCount })}
          </span>

          <label className="request-logs__page-size">
            <span>{t('admin.requestLogs.pagination.pageSize')}</span>
            <select
              value={pageSize}
              onChange={(event) => handlePageSizeChange(event.target.value)}
              disabled={isLoading}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="request-logs__ai-block" aria-label={t('admin.requestLogs.ai.aria')}>
        <div className="request-logs__ai-header">
          <h3 className="request-logs__ai-title">{t('admin.requestLogs.ai.title')}</h3>
          <button
            type="button"
            className="request-logs__button request-logs__button--secondary"
            onClick={() => setAiReloadToken((current) => current + 1)}
            disabled={isAiLoading}
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>{t('admin.requestLogs.refresh')}</span>
          </button>
        </div>

        {isAiLoading && !aiResult ? (
          <p className="request-logs__message">{t('admin.requestLogs.ai.loading')}</p>
        ) : null}

        {aiErrorMessage ? (
          <p className="request-logs__message request-logs__message--error" role="alert">
            {aiErrorMessage}
          </p>
        ) : null}

        {!aiErrorMessage && aiResult && aiItems.length === 0 && !isAiLoading ? (
          <p className="request-logs__message">{t('admin.requestLogs.ai.empty')}</p>
        ) : null}

        {!aiErrorMessage && aiItems.length > 0 ? (
          <div
            className={`request-logs__table-wrap ${isAiLoading ? 'request-logs__table-wrap--loading' : ''}`}
            aria-busy={isAiLoading}
          >
            <table className="request-logs__table" aria-label={t('admin.requestLogs.ai.tableAria')}>
              <thead>
                <tr>
                  <th>{t('admin.requestLogs.ai.columns.timestamp')}</th>
                  <th className="request-logs__ai-column-request">{t('admin.requestLogs.ai.columns.request')}</th>
                  <th className="request-logs__ai-column-response">{t('admin.requestLogs.ai.columns.response')}</th>
                  <th>{t('admin.requestLogs.ai.columns.userFlight')}</th>
                </tr>
              </thead>
              <tbody>
                {aiItems.map((entry) => (
                  <tr key={entry.id}>
                    <td className="request-logs__cell-time">{formatTimestamp(entry.timestamp)}</td>
                    <td className="request-logs__cell-path request-logs__cell-ai-request">{entry.request || '-'}</td>
                    <td className="request-logs__cell-path request-logs__cell-ai-response">
                      <div className="request-logs__json-list">
                        {formatAiResponse(entry.response).map((line, index) => (
                          <div key={`${entry.id}-resp-${line.key}-${index}`} className="request-logs__json-row">
                            <span className="request-logs__json-key">{line.key}</span>
                            <span className="request-logs__json-value">{line.value}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="request-logs__cell-userid">{`${entry.userId ?? '-'} / ${entry.flightId ?? '-'}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!aiErrorMessage ? (
          <div className="request-logs__pagination" aria-label={t('admin.requestLogs.ai.pagination.aria')}>
            <button
              type="button"
              className="request-logs__button request-logs__button--secondary"
              onClick={() => setAiPage((current) => Math.max(1, current - 1))}
              disabled={isAiLoading || aiPage <= 1}
            >
              <ChevronLeft size={14} aria-hidden="true" />
              <span>{t('admin.requestLogs.pagination.previous')}</span>
            </button>

            <span className="request-logs__pagination-label" aria-live="polite">
              {t('admin.requestLogs.ai.pagination.page', { page: aiPage, total: aiTotalPages })}
            </span>

            <button
              type="button"
              className="request-logs__button request-logs__button--secondary"
              onClick={() => setAiPage((current) => current + 1)}
              disabled={isAiLoading || !aiResult?.hasNextPage}
            >
              <span>{t('admin.requestLogs.pagination.next')}</span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>

            <span className="request-logs__total">
              {t('admin.requestLogs.ai.pagination.total', { count: aiTotalCount })}
            </span>

            <label className="request-logs__page-size">
              <span>{t('admin.requestLogs.pagination.pageSize')}</span>
              <select
                value={aiPageSize}
                onChange={(event) => handleAiPageSizeChange(event.target.value)}
                disabled={isAiLoading}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>
    </section>
  )
}
