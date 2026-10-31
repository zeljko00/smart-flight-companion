import { createElement, useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Download, Funnel } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthHeader } from '../components/AuthHeader'
import { UserInfo } from '../components/UserInfo'
import type { UserDto } from '../services/authService'
import {
  fetchAllFlights,
  type FlightSearchFilters,
  type FlightTableRow,
} from '../services/flightsService'
import {
  downloadBoardingPassPdf,
  fetchBoardingPassesByUserId,
  type UserBoardingPass,
} from '../services/boardingPassesService'
import { fetchLatestNews, type NewsArticle } from '../services/newsService'
import '../style/HomePage.css'

type HomeLocationState = {
  user?: UserDto
  homeFilters?: {
    airline: string
    start: string
    destination: string
    departureTime: string
    maxPrice: string
    status: string
    isFilterPanelOpen: boolean
    page?: number
    pageSize?: number
  }
}

const HOME_PAGINATION_STORAGE_KEY = 'home-pagination'

type HomePaginationState = {
  page: number
  pageSize: number
}

function readSavedPaginationState(): HomePaginationState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(HOME_PAGINATION_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<HomePaginationState>
    const page = Number(parsed.page)
    const pageSize = Number(parsed.pageSize)

    if (!Number.isInteger(page) || page < 1) {
      return null
    }

    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return null
    }

    return { page, pageSize }
  } catch {
    return null
  }
}

function savePaginationState(state: HomePaginationState): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(HOME_PAGINATION_STORAGE_KEY, JSON.stringify(state))
}

function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseLocalDateInput(value: string): Date | undefined {
  if (!value) {
    return undefined
  }

  const [yearRaw, monthRaw, dayRaw] = value.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined
  }

  // Use UTC noon to avoid timezone rollover when converted to ISO for API calls.
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const ALLOWED_NEWS_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'a',
])

function isAllowedNewsUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function parseNewsSummaryToReact(summary: string): ReactNode {
  if (typeof window === 'undefined') {
    return summary
  }

  const parser = new DOMParser()
  const document = parser.parseFromString(`<div>${summary}</div>`, 'text/html')
  const root = document.body.firstElementChild

  if (!root) {
    return summary
  }

  const mapNodes = (nodes: ChildNode[], keyPrefix: string): ReactNode[] => {
    const mapped: ReactNode[] = []

    nodes.forEach((node, index) => {
      const key = `${keyPrefix}-${index}`

      if (node.nodeType === Node.TEXT_NODE) {
        const textContent = node.textContent ?? ''
        if (textContent) {
          mapped.push(textContent)
        }
        return
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return
      }

      const element = node as HTMLElement
      const tagName = element.tagName.toLowerCase()
      const children = mapNodes(Array.from(element.childNodes), key)

      if (!ALLOWED_NEWS_TAGS.has(tagName)) {
        mapped.push(...children)
        return
      }

      if (tagName === 'a') {
        const href = element.getAttribute('href')?.trim() ?? ''

        if (!href || !isAllowedNewsUrl(href)) {
          mapped.push(...children)
          return
        }

        mapped.push(
          createElement(
            'a',
            {
              key,
              href,
              target: '_blank',
              rel: 'noopener noreferrer',
            },
            children,
          ),
        )
        return
      }

      mapped.push(createElement(tagName, { key }, children))
    })

    return mapped
  }

  return mapNodes(Array.from(root.childNodes), 'home-news-summary')
}

export function HomePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state as HomeLocationState | null) ?? null
  const user = locationState?.user ?? null
  const preservedFilters = locationState?.homeFilters
  const savedPagination = readSavedPaginationState()
  const initialPage =
    typeof preservedFilters?.page === 'number' && preservedFilters.page >= 1
      ? preservedFilters.page
      : savedPagination?.page ?? 1
  const initialPageSize =
    typeof preservedFilters?.pageSize === 'number' && preservedFilters.pageSize >= 1 && preservedFilters.pageSize <= 100
      ? preservedFilters.pageSize
      : savedPagination?.pageSize ?? 20
  const statusOptions = ['Scheduled', 'Delayed', 'Departed', 'Arrived', 'Cancelled']
  const initialDepartureFilter = preservedFilters?.departureTime || toLocalDateInputValue(new Date())

  const [flights, setFlights] = useState<FlightTableRow[]>([])
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(preservedFilters?.isFilterPanelOpen ?? false)
  const [airlineFilter, setAirlineFilter] = useState(preservedFilters?.airline ?? '')
  const [startFilter, setStartFilter] = useState(preservedFilters?.start ?? '')
  const [destinationFilter, setDestinationFilter] = useState(preservedFilters?.destination ?? '')
  const [departureTimeFilter, setDepartureTimeFilter] = useState(initialDepartureFilter)
  const [maxPriceFilter, setMaxPriceFilter] = useState(preservedFilters?.maxPrice ?? '')
  const [statusFilter, setStatusFilter] = useState(preservedFilters?.status ?? '')
  const [minDepartureTime, setMinDepartureTime] = useState(initialDepartureFilter)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [totalFlights, setTotalFlights] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasInitializedFlights, setHasInitializedFlights] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [boardingPasses, setBoardingPasses] = useState<UserBoardingPass[]>([])
  const [isBoardingPassesLoading, setIsBoardingPassesLoading] = useState(false)
  const [boardingPassesErrorMessage, setBoardingPassesErrorMessage] = useState<string | null>(null)
  const [downloadingBoardingPassId, setDownloadingBoardingPassId] = useState<string | null>(null)
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([])
  const [isNewsLoading, setIsNewsLoading] = useState(false)
  const [newsErrorMessage, setNewsErrorMessage] = useState<string | null>(null)

  const loadFlights = useCallback(
    async (filters: FlightSearchFilters = {}, page = 1, size = pageSize) => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const result = await fetchAllFlights(filters, { page, pageSize: size })
        setFlights(result.items)
        setCurrentPage(result.page)
        setPageSize(result.pageSize)
        setTotalFlights(result.totalCount)
        setHasNextPage(result.hasNextPage)
        savePaginationState({
          page: result.page,
          pageSize: result.pageSize,
        })
      } catch {
        setErrorMessage(t('home.loadError'))
        setHasNextPage(false)
      } finally {
        setIsLoading(false)
      }
    },
    [pageSize, t],
  )

  const buildCurrentFilters = useCallback((): FlightSearchFilters => {
    const parsedMaxPrice = maxPriceFilter.trim() ? Number(maxPriceFilter) : undefined
    const maxPrice =
      typeof parsedMaxPrice === 'number' && Number.isFinite(parsedMaxPrice) && parsedMaxPrice >= 0
        ? parsedMaxPrice
        : undefined

    return {
      airline: airlineFilter,
      start: startFilter,
      destination: destinationFilter,
      departureTime: parseLocalDateInput(departureTimeFilter),
      maxPrice,
      status: statusFilter,
    }
  }, [airlineFilter, departureTimeFilter, destinationFilter, maxPriceFilter, startFilter, statusFilter])

  useEffect(() => {
    const refreshMinTime = () => {
      const nowValue = toLocalDateInputValue(new Date())
      setMinDepartureTime(nowValue)
      setDepartureTimeFilter((currentValue) => {
        if (!currentValue || currentValue < nowValue) {
          return nowValue
        }

        return currentValue
      })
    }

    refreshMinTime()
    const intervalId = window.setInterval(refreshMinTime, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (hasInitializedFlights) {
      return
    }

    let isDisposed = false

    void (async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const maxPriceRaw = preservedFilters?.maxPrice?.trim()
        const maxPriceParsed = maxPriceRaw ? Number(maxPriceRaw) : undefined
        const maxPrice =
          typeof maxPriceParsed === 'number' && Number.isFinite(maxPriceParsed) && maxPriceParsed >= 0
            ? maxPriceParsed
            : undefined

        const result = await fetchAllFlights(
          {
            airline: preservedFilters?.airline || undefined,
            start: preservedFilters?.start || undefined,
            destination: preservedFilters?.destination || undefined,
            departureTime: parseLocalDateInput(initialDepartureFilter),
            maxPrice,
            status: preservedFilters?.status || undefined,
          },
          { page: initialPage, pageSize: initialPageSize },
        )
        if (!isDisposed) {
          setFlights(result.items)
          setCurrentPage(result.page)
          setPageSize(result.pageSize)
          setTotalFlights(result.totalCount)
          setHasNextPage(result.hasNextPage)
          savePaginationState({
            page: result.page,
            pageSize: result.pageSize,
          })
          setHasInitializedFlights(true)
        }
      } catch {
        if (!isDisposed) {
          setErrorMessage(t('home.loadError'))
          setHasNextPage(false)
          setHasInitializedFlights(true)
        }
      } finally {
        if (!isDisposed) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      isDisposed = true
    }
  }, [hasInitializedFlights, initialDepartureFilter, initialPage, initialPageSize, preservedFilters, t])

  useEffect(() => {
    if (!user?.id) {
      setBoardingPasses([])
      setIsBoardingPassesLoading(false)
      setBoardingPassesErrorMessage(null)
      return
    }

    let isDisposed = false

    void (async () => {
      setIsBoardingPassesLoading(true)
      setBoardingPassesErrorMessage(null)

      try {
        const result = await fetchBoardingPassesByUserId(user.id)
        if (!isDisposed) {
          setBoardingPasses(result)
        }
      } catch {
        if (!isDisposed) {
          setBoardingPassesErrorMessage(t('home.boardingPasses.loadError'))
        }
      } finally {
        if (!isDisposed) {
          setIsBoardingPassesLoading(false)
        }
      }
    })()

    return () => {
      isDisposed = true
    }
  }, [t, user?.id])

  useEffect(() => {
    let isDisposed = false

    void (async () => {
      setIsNewsLoading(true)
      setNewsErrorMessage(null)

      try {
        const result = await fetchLatestNews(6)
        if (!isDisposed) {
          setNewsArticles(result)
        }
      } catch {
        if (!isDisposed) {
          setNewsErrorMessage(t('home.news.loadError'))
        }
      } finally {
        if (!isDisposed) {
          setIsNewsLoading(false)
        }
      }
    })()

    return () => {
      isDisposed = true
    }
  }, [t])

  const handleLogout = () => {
    navigate('/', { replace: true })
  }

  const handleOpenFlightDetails = (flightId: string) => {
    navigate(`/flights/${encodeURIComponent(flightId)}`, {
      state: {
        user,
        homeFilters: {
          airline: airlineFilter,
          start: startFilter,
          destination: destinationFilter,
          departureTime: departureTimeFilter,
          maxPrice: maxPriceFilter,
          status: statusFilter,
          isFilterPanelOpen,
          page: currentPage,
          pageSize,
        },
      },
    })
  }

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const departureTime = parseLocalDateInput(departureTimeFilter)

    const parsedMaxPrice = maxPriceFilter.trim() ? Number(maxPriceFilter) : undefined
    const maxPrice = typeof parsedMaxPrice === 'number' && Number.isFinite(parsedMaxPrice) && parsedMaxPrice >= 0
      ? parsedMaxPrice
      : undefined

    await loadFlights({
      airline: airlineFilter,
      start: startFilter,
      destination: destinationFilter,
      departureTime,
      maxPrice,
      status: statusFilter,
    }, 1, pageSize)
  }

  const handleFilterReset = async () => {
    const nowValue = toLocalDateInputValue(new Date())
    setAirlineFilter('')
    setStartFilter('')
    setDestinationFilter('')
    setDepartureTimeFilter(nowValue)
    setMinDepartureTime(nowValue)
    setMaxPriceFilter('')
    setStatusFilter('')
    await loadFlights({ departureTime: parseLocalDateInput(nowValue) }, 1, pageSize)
  }

  const handlePreviousPage = async () => {
    if (currentPage <= 1 || isLoading) {
      return
    }

    await loadFlights(buildCurrentFilters(), currentPage - 1, pageSize)
  }

  const handleNextPage = async () => {
    if (!hasNextPage || isLoading) {
      return
    }

    await loadFlights(buildCurrentFilters(), currentPage + 1, pageSize)
  }

  const handlePageSizeChange = async (value: string) => {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 1) {
      return
    }

    await loadFlights(buildCurrentFilters(), 1, parsed)
  }

  const canGoNextPage = !isLoading
    && flights.length > 0
    && hasNextPage
    && (currentPage * pageSize) < totalFlights

  const formatDateTime = (value: string) => {
    const parsedDate = new Date(value)

    if (Number.isNaN(parsedDate.getTime())) {
      return 'TBD'
    }

    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsedDate)
  }

  const formatPrice = (value: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return t('home.columns.noPrice')
    }

    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatNewsDate = (value: string | null) => {
    if (!value) {
      return t('home.news.unknownDate')
    }

    const parsedDate = new Date(value)

    if (Number.isNaN(parsedDate.getTime())) {
      return t('home.news.unknownDate')
    }

    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsedDate)
  }

  const handleDownloadBoardingPassPdf = async (boardingPass: UserBoardingPass) => {
    setBoardingPassesErrorMessage(null)
    setDownloadingBoardingPassId(boardingPass.id)

    try {
      const pdfBlob = await downloadBoardingPassPdf(boardingPass.id)
      const objectUrl = window.URL.createObjectURL(pdfBlob)
      const downloadLink = document.createElement('a')
      downloadLink.href = objectUrl
      downloadLink.download = `boarding-pass-${boardingPass.id}.pdf`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      downloadLink.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch {
      setBoardingPassesErrorMessage(t('home.boardingPasses.downloadError'))
    } finally {
      setDownloadingBoardingPassId(null)
    }
  }

  return (
    <main className="home-page">
      <div className="home-page__ambient" aria-hidden="true" />

      <section className="home-page__shell" aria-label={t('home.sectionAria')}>
        <article className="home-page__panel" aria-label={t('home.panelAria')}>
          <AuthHeader />
          <UserInfo user={user} onLogout={handleLogout} />

          <div className="home-page__heading-area">
            <div className="home-page__heading">
              <h2>{t('home.title')}</h2>
              <p>{t('home.subtitle')}</p>
              <button
                type="button"
                className="home-page__filterbackend/secrets/qr-signing/signing-cert.pem backend/secrets/qr-signing/signing-cert.escaped.txt backend/secrets/qr-signing/public.pem backend/secrets/qr-signing/public.escaped.txt backend/secrets/qr-signing/private.pem backend/secrets/qr-signing/private.escaped.txt-toggle"
                onClick={() => setIsFilterPanelOpen((currentValue) => !currentValue)}
                aria-expanded={isFilterPanelOpen}
                aria-controls="home-page-filter-panel"
                aria-label={t('home.filters.toggle')}
              >
                <Funnel size={16} aria-hidden="true" />
                <span>{t('home.filters.toggle')}</span>
              </button>
            </div>

            <div
              id="home-page-filter-panel"
              className="home-page__filters-layer"
              hidden={!isFilterPanelOpen}
            >
              <form className="home-page__filters" onSubmit={handleFilterSubmit}>
            <label className="home-page__filter-field">
              <span>{t('home.filters.airline')}</span>
              <input
                type="text"
                value={airlineFilter}
                onChange={(event) => setAirlineFilter(event.target.value)}
                placeholder={t('home.filters.airlinePlaceholder')}
              />
            </label>

            <label className="home-page__filter-field">
              <span>{t('home.filters.start')}</span>
              <input
                type="text"
                value={startFilter}
                onChange={(event) => setStartFilter(event.target.value)}
                placeholder={t('home.filters.startPlaceholder')}
              />
            </label>

            <label className="home-page__filter-field">
              <span>{t('home.filters.destination')}</span>
              <input
                type="text"
                value={destinationFilter}
                onChange={(event) => setDestinationFilter(event.target.value)}
                placeholder={t('home.filters.destinationPlaceholder')}
              />
            </label>

            <label className="home-page__filter-field">
              <span>{t('home.filters.departureTime')}</span>
              <input
                type="date"
                value={departureTimeFilter}
                min={minDepartureTime}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setDepartureTimeFilter(nextValue < minDepartureTime ? minDepartureTime : nextValue)
                }}
              />
            </label>

            <label className="home-page__filter-field">
              <span>{t('home.filters.maxPrice')}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxPriceFilter}
                onChange={(event) => setMaxPriceFilter(event.target.value)}
                placeholder={t('home.filters.maxPricePlaceholder')}
              />
            </label>

            <label className="home-page__filter-field">
              <span>{t('home.filters.status')}</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">{t('home.filters.allStatuses')}</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {t(`common.${status}`)}
                  </option>
                ))}
              </select>
            </label>

            <div className="home-page__filter-actions">
              <button type="submit" className="home-page__button home-page__button--primary">
                {t('home.filters.apply')}
              </button>
              <button
                type="button"
                className="home-page__button home-page__button--secondary"
                onClick={() => {
                  void handleFilterReset()
                }}
              >
                {t('home.filters.reset')}
              </button>
            </div>
              </form>
            </div>
          </div>

          {isLoading ? <p className="home-page__status">{t('home.loading')}</p> : null}

          {!isLoading && errorMessage ? (
            <p className="home-page__status home-page__status--error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {!isLoading && !errorMessage && flights.length === 0 ? (
            <p className="home-page__status">{t('home.empty')}</p>
          ) : null}

          {!isLoading && !errorMessage && flights.length > 0 ? (
            <section className="home-page__table-wrap" aria-label={t('home.tableAria')}>
              <table className="home-page__table">
                <thead>
                  <tr>
                    <th>{t('home.columns.flight')}</th>
                    <th>{t('home.columns.airline')}</th>
                    <th>{t('home.columns.route')}</th>
                    <th>{t('home.columns.departure')}</th>
                    <th>{t('home.columns.lowestPrice')}</th>
                    <th>{t('home.columns.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map((flight) => (
                    <tr
                      key={flight.id}
                      className="home-page__table-row"
                      role="link"
                      tabIndex={0}
                      onClick={() => handleOpenFlightDetails(flight.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleOpenFlightDetails(flight.id)
                        }
                      }}
                      aria-label={`${t('home.columns.openDetails')}: ${flight.flightNumber}`}
                    >
                      <td>{flight.flightNumber}</td>
                      <td>{flight.airline}</td>
                      <td>{flight.fromLabel} &rarr; {flight.toLabel}</td>
                      <td>{flight.departureLabel}</td>
                      <td>{flight.lowestPriceLabel === 'N/A' ? t('home.columns.noPrice') : flight.lowestPriceLabel}</td>
                      <td>
                        <span className="home-page__status-pill">{t(`common.${flight.statusLabel}`)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          {!errorMessage ? (
            <div className="home-page__pagination" aria-label={t('home.pagination.aria')}>
              <button
                type="button"
                className="home-page__button home-page__button--secondary"
                onClick={() => {
                  void handlePreviousPage()
                }}
                disabled={isLoading || currentPage <= 1}
              >
                {t('home.pagination.previous')}
              </button>

              <span className="home-page__pagination-label">
                {t('home.pagination.page', { page: currentPage })}
              </span>

              <button
                type="button"
                className="home-page__button home-page__button--secondary"
                onClick={() => {
                  void handleNextPage()
                }}
                disabled={!canGoNextPage}
              >
                {t('home.pagination.next')}
              </button>

              <label className="home-page__pagination-size">
                <span>{t('home.pagination.pageSize')}</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    void handlePageSizeChange(event.target.value)
                  }}
                  disabled={isLoading}
                >
                  {[2, 5, 10, 20, 50].map((sizeOption) => (
                    <option key={sizeOption} value={sizeOption}>
                      {sizeOption}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          <section className="home-page__news-section" aria-label={t('home.news.listAria')}>
            <div className="home-page__news-header">
              <h3>{t('home.news.title')}</h3>
            </div>

            {isNewsLoading ? (
              <p className="home-page__status">{t('home.news.loading')}</p>
            ) : null}

            {!isNewsLoading && newsErrorMessage ? (
              <p className="home-page__status home-page__status--error" role="alert">
                {newsErrorMessage}
              </p>
            ) : null}

            {!isNewsLoading && !newsErrorMessage && newsArticles.length === 0 ? (
              <p className="home-page__status">{t('home.news.empty')}</p>
            ) : null}

            {!isNewsLoading && !newsErrorMessage && newsArticles.length > 0 ? (
              <ol className="home-page__news-list" aria-label={t('home.news.listAria')}>
                {newsArticles.map((article) => (
                  <li key={`${article.link}-${article.title}`} className="home-page__news-item">
                      {article.title}
                    <p className="home-page__news-time">{formatNewsDate(article.publishedAt)}</p>
                    {article.summary ? (
                      <div className="home-page__news-summary">
                        {parseNewsSummaryToReact(article.summary)}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}
          </section>

          <section className="home-page__boarding-pass-section" aria-label={t('home.boardingPasses.tableAria')}>
            <div className="home-page__boarding-pass-header">
              <h3>{t('home.boardingPasses.title')}</h3>
            </div>

            {isBoardingPassesLoading ? (
              <p className="home-page__status">{t('home.boardingPasses.loading')}</p>
            ) : null}

            {!isBoardingPassesLoading && boardingPassesErrorMessage ? (
              <p className="home-page__status home-page__status--error" role="alert">
                {boardingPassesErrorMessage}
              </p>
            ) : null}

            {!isBoardingPassesLoading && !boardingPassesErrorMessage && boardingPasses.length === 0 ? (
              <p className="home-page__status">{t('home.boardingPasses.empty')}</p>
            ) : null}

            {!isBoardingPassesLoading && !boardingPassesErrorMessage && boardingPasses.length > 0 ? (
              <div className="home-page__table-wrap" aria-label={t('home.boardingPasses.tableAria')}>
                <table className="home-page__table home-page__table--boarding-passes">
                  <thead>
                    <tr>
                      <th>{t('home.boardingPasses.columns.flight')}</th>
                      <th>{t('home.boardingPasses.columns.airline')}</th>
                      <th>{t('home.boardingPasses.columns.route')}</th>
                      <th>{t('home.boardingPasses.columns.departure')}</th>
                      <th>{t('home.boardingPasses.columns.seat')}</th>
                      <th>{t('home.boardingPasses.columns.price')}</th>
                      <th>{t('home.boardingPasses.columns.issuedAt')}</th>
                      <th>{t('home.boardingPasses.columns.validity')}</th>
                      <th>{t('home.boardingPasses.columns.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boardingPasses.map((boardingPass) => (
                      <tr key={boardingPass.id}>
                        <td>{boardingPass.flightNumber}</td>
                        <td>{boardingPass.airline}</td>
                        <td>{boardingPass.routeStart} &rarr; {boardingPass.routeDest}</td>
                        <td>{formatDateTime(boardingPass.departureAt)}</td>
                        <td>{t(`flightDetails.boardingPass.seats.${boardingPass.seat}`)}</td>
                        <td>{formatPrice(boardingPass.price)}</td>
                        <td>{formatDateTime(boardingPass.issuedAt)}</td>
                        <td>
                          <span className="home-page__status-pill">
                            {boardingPass.isValid
                              ? t('home.boardingPasses.valid')
                              : t('home.boardingPasses.invalid')}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="home-page__inline-action"
                            onClick={() => {
                              void handleDownloadBoardingPassPdf(boardingPass)
                            }}
                            disabled={downloadingBoardingPassId === boardingPass.id}
                            aria-label={t('home.boardingPasses.download')}
                          >
                            <Download size={14} aria-hidden="true" />
                            <span>
                              {downloadingBoardingPassId === boardingPass.id
                                ? t('home.boardingPasses.downloading')
                                : t('home.boardingPasses.download')}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        </article>
      </section>
    </main>
  )
}