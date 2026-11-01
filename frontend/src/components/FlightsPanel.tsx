import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../services/apiClient'
import {
  FLIGHT_STATUS_OPTIONS,
  createFlight,
  fetchAllFlights,
  fetchFlightForEdit,
  updateFlight,
  type FlightEditData,
  type FlightRequest,
  type FlightTablePage,
} from '../services/flightsService'
import { FlightForm } from './FlightForm'
import '../style/FlightsPanel.css'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

type FormState = { mode: 'create' } | { mode: 'edit'; flight: FlightEditData } | null

function getStatusClassName(status: string): string {
  switch (status.toLowerCase()) {
    case 'cancelled':
      return 'flights__status--error'
    case 'delayed':
      return 'flights__status--warning'
    case 'departed':
    case 'arrived':
      return 'flights__status--success'
    default:
      return 'flights__status--neutral'
  }
}

export type FlightsViewState = {
  airline: string
  start: string
  destination: string
  status: string
  page: number
}

type FlightsPanelProps = {
  initialView?: FlightsViewState
  onOpenFlight: (flightId: string, view: FlightsViewState) => void
}

export function FlightsPanel({ initialView, onOpenFlight }: FlightsPanelProps) {
  const { t } = useTranslation()
  const [airlineValue, setAirlineValue] = useState(initialView?.airline ?? '')
  const [routeStartValue, setRouteStartValue] = useState(initialView?.start ?? '')
  const [routeDestinationValue, setRouteDestinationValue] = useState(initialView?.destination ?? '')
  const [statusFilter, setStatusFilter] = useState(initialView?.status ?? '')
  const [filters, setFilters] = useState({
    airline: (initialView?.airline ?? '').trim(),
    start: (initialView?.start ?? '').trim(),
    destination: (initialView?.destination ?? '').trim(),
  })
  const filtersRef = useRef(filters)
  const [page, setPage] = useState(initialView?.page ?? 1)
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<FlightTablePage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const [formState, setFormState] = useState<FormState>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const next = {
        airline: airlineValue.trim(),
        start: routeStartValue.trim(),
        destination: routeDestinationValue.trim(),
      }
      const current = filtersRef.current

      // Only reset paging when the filters actually changed (not when restoring a saved view).
      if (
        next.airline !== current.airline ||
        next.start !== current.start ||
        next.destination !== current.destination
      ) {
        filtersRef.current = next
        setFilters(next)
        setPage(1)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [airlineValue, routeStartValue, routeDestinationValue])

  useEffect(() => {
    let isDisposed = false

    void (async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await fetchAllFlights(
          {
            airline: filters.airline || undefined,
            start: filters.start || undefined,
            destination: filters.destination || undefined,
            status: statusFilter || undefined,
          },
          { page, pageSize: PAGE_SIZE },
        )

        if (!isDisposed) {
          setResult(response)
        }
      } catch (error) {
        if (!isDisposed) {
          setErrorMessage(error instanceof ApiError ? error.message : t('admin.flights.loadError'))
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
  }, [filters, page, reloadToken, statusFilter, t])

  const hasFilters = airlineValue !== '' || routeStartValue !== '' || routeDestinationValue !== '' || statusFilter !== ''

  const handleClearFilters = () => {
    setAirlineValue('')
    setRouteStartValue('')
    setRouteDestinationValue('')
    setStatusFilter('')
    setPage(1)
  }

  const closeForm = () => {
    setFormState(null)
    setFormError(null)
  }

  const handleOpenCreate = () => {
    setNoticeMessage(null)
    setFormError(null)
    setFormState({ mode: 'create' })
  }

  const handleOpenEdit = async (id: string) => {
    setNoticeMessage(null)
    setFormError(null)
    setOpeningId(id)

    try {
      const flight = await fetchFlightForEdit(id)
      setFormState({ mode: 'edit', flight })
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : t('admin.flights.openError'))
    } finally {
      setOpeningId(null)
    }
  }

  const handleSubmit = async (request: FlightRequest) => {
    if (!formState) {
      return
    }

    setFormError(null)
    setIsSaving(true)

    try {
      if (formState.mode === 'edit') {
        await updateFlight(formState.flight.id, request)
        setNoticeMessage(t('admin.flights.updateSuccess', { number: request.flightNumber }))
      } else {
        await createFlight(request)
        setNoticeMessage(t('admin.flights.createSuccess', { number: request.flightNumber }))
      }

      closeForm()
      setReloadToken((current) => current + 1)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setFormError(t('admin.flights.form.duplicate'))
      } else {
        setFormError(error instanceof ApiError ? error.message : t('admin.flights.form.saveError'))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const items = result?.items ?? []
  const totalCount = result?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const openFlight = (flightId: string) => {
    onOpenFlight(flightId, {
      airline: airlineValue,
      start: routeStartValue,
      destination: routeDestinationValue,
      status: statusFilter,
      page,
    })
  }

  return (
    <section className="flights" aria-label={t('admin.flights.aria')}>
      <div className="flights__toolbar">
        <div className="flights__filters" role="group" aria-label={t('admin.flights.filtersAria')}>
          <label className="flights__search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={airlineValue}
              placeholder={t('admin.flights.airlinePlaceholder')}
              aria-label={t('admin.flights.columns.airline')}
              onChange={(event) => setAirlineValue(event.target.value)}
            />
          </label>

          <label className="flights__search flights__search--short">
            <input
              type="search"
              value={routeStartValue}
              placeholder={t('admin.flights.startPlaceholder')}
              aria-label={t('admin.flights.startLabel')}
              onChange={(event) => setRouteStartValue(event.target.value)}
            />
          </label>

          <label className="flights__search flights__search--short">
            <input
              type="search"
              value={routeDestinationValue}
              placeholder={t('admin.flights.destinationPlaceholder')}
              aria-label={t('admin.flights.destinationLabel')}
              onChange={(event) => setRouteDestinationValue(event.target.value)}
            />
          </label>

          <select
            className="flights__select"
            value={statusFilter}
            aria-label={t('admin.flights.columns.status')}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
          >
            <option value="">{t('admin.flights.allStatuses')}</option>
            {FLIGHT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {t(`admin.flights.statuses.${status}`, { defaultValue: status })}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="flights__button flights__button--ghost"
            onClick={handleClearFilters}
            disabled={!hasFilters}
          >
            <X size={14} aria-hidden="true" />
            <span>{t('admin.flights.clear')}</span>
          </button>
        </div>

        <div className="flights__actions">
          <button
            type="button"
            className="flights__button flights__button--secondary"
            onClick={() => setReloadToken((current) => current + 1)}
            disabled={isLoading}
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>{t('admin.flights.refresh')}</span>
          </button>
          <button
            type="button"
            className="flights__button flights__button--primary"
            onClick={handleOpenCreate}
            disabled={formState?.mode === 'create'}
          >
            <Plus size={14} aria-hidden="true" />
            <span>{t('admin.flights.add')}</span>
          </button>
        </div>
      </div>

      {formState ? (
        <FlightForm
          key={formState.mode === 'edit' ? formState.flight.id : 'create'}
          initial={formState.mode === 'edit' ? formState.flight : null}
          isSaving={isSaving}
          errorMessage={formError}
          onSubmit={(request) => { void handleSubmit(request) }}
          onCancel={closeForm}
        />
      ) : null}

      {noticeMessage ? (
        <p className="flights__message flights__message--success" role="status">{noticeMessage}</p>
      ) : null}

      {errorMessage ? (
        <p className="flights__message flights__message--error" role="alert">{errorMessage}</p>
      ) : null}

      {isLoading && !result && !errorMessage ? (
        <p className="flights__message">{t('admin.flights.loading')}</p>
      ) : null}

      {!isLoading && !errorMessage && items.length === 0 ? (
        <p className="flights__message">{hasFilters ? t('admin.flights.emptySearch') : t('admin.flights.empty')}</p>
      ) : null}

      {!errorMessage && items.length > 0 ? (
        <div className={`flights__table-wrap ${isLoading ? 'flights__table-wrap--loading' : ''}`} aria-busy={isLoading}>
          <table className="flights__table" aria-label={t('admin.flights.tableAria')}>
            <thead>
              <tr>
                <th>{t('admin.flights.columns.flight')}</th>
                <th>{t('admin.flights.columns.airline')}</th>
                <th>{t('admin.flights.columns.route')}</th>
                <th>{t('admin.flights.columns.departure')}</th>
                <th>{t('admin.flights.columns.status')}</th>
                <th>{t('admin.flights.columns.lowestPrice')}</th>
                <th><span className="flights__sr-only">{t('admin.flights.columns.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((flight) => (
                <tr
                  key={flight.id}
                  className="flights__row"
                  role="link"
                  tabIndex={0}
                  onClick={() => openFlight(flight.id)}
                  onKeyDown={(event) => {
                    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      openFlight(flight.id)
                    }
                  }}
                  aria-label={`${t('home.columns.openDetails')}: ${flight.flightNumber}`}
                >
                  <td><span className="flights__number">{flight.flightNumber}</span></td>
                  <td>{flight.airline}</td>
                  <td className="flights__route">{flight.fromLabel} &rarr; {flight.toLabel}</td>
                  <td className="flights__nowrap">{flight.departureLabel}</td>
                  <td>
                    <span className={`flights__status ${getStatusClassName(flight.statusLabel)}`}>
                      {t(`admin.flights.statuses.${flight.statusLabel}`, { defaultValue: flight.statusLabel })}
                    </span>
                  </td>
                  <td className="flights__nowrap">{flight.lowestPriceLabel}</td>
                  <td className="flights__cell-actions">
                    <button
                      type="button"
                      className="flights__icon-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleOpenEdit(flight.id)
                      }}
                      disabled={openingId === flight.id}
                      aria-label={t('admin.flights.edit')}
                      title={t('admin.flights.edit')}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!errorMessage && totalCount > 0 ? (
        <div className="flights__pagination" aria-label={t('admin.flights.pagination.aria')}>
          <button
            type="button"
            className="flights__button flights__button--secondary"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={isLoading || page <= 1}
          >
            <ChevronLeft size={14} aria-hidden="true" />
            <span>{t('admin.flights.pagination.previous')}</span>
          </button>
          <span className="flights__pagination-label">
            {t('admin.flights.pagination.page', { page, total: totalPages })}
          </span>
          <button
            type="button"
            className="flights__button flights__button--secondary"
            onClick={() => setPage((current) => current + 1)}
            disabled={isLoading || !result?.hasNextPage}
          >
            <span>{t('admin.flights.pagination.next')}</span>
            <ChevronRight size={14} aria-hidden="true" />
          </button>
          <span className="flights__total">{t('admin.flights.pagination.total', { count: totalCount })}</span>
        </div>
      ) : null}
    </section>
  )
}
