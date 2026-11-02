import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ClipboardList, Pencil, Plus, RefreshCw, Search, Upload, X } from 'lucide-react'
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
import {
  attachBoardingGuideMediaFile,
  attachBoardingGuideMediaUrl,
  createBoardingGuide,
} from '../services/boardingGuidesService'
import { FlightForm } from './FlightForm'
import '../style/FlightsPanel.css'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

type FormState = { mode: 'create' } | { mode: 'edit'; flight: FlightEditData } | null
type BoardingGuideFormState = {
  flightId: string
  flightNumber: string
}

type BoardingGuideFormValues = {
  description: string
  opensAtLocal: string
  closesAtLocal: string
  imageUrls: string[]
  videoUrls: string[]
  imageFiles: File[]
  videoFiles: File[]
}

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function createInitialBoardingGuideValues(): BoardingGuideFormValues {
  const now = new Date()
  const closesAt = new Date(now.getTime() + 60 * 60 * 1000)

  return {
    description: '',
    opensAtLocal: formatDateTimeLocal(now),
    closesAtLocal: formatDateTimeLocal(closesAt),
    imageUrls: [''],
    videoUrls: [''],
    imageFiles: [],
    videoFiles: [],
  }
}

function isAbsoluteUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

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
  const [boardingGuideFormState, setBoardingGuideFormState] = useState<BoardingGuideFormState | null>(null)
  const [boardingGuideValues, setBoardingGuideValues] = useState<BoardingGuideFormValues>(createInitialBoardingGuideValues)
  const [boardingGuideError, setBoardingGuideError] = useState<string | null>(null)
  const [isSavingBoardingGuide, setIsSavingBoardingGuide] = useState(false)

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

  const closeBoardingGuideForm = () => {
    setBoardingGuideFormState(null)
    setBoardingGuideValues(createInitialBoardingGuideValues())
    setBoardingGuideError(null)
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

  const handleOpenBoardingGuideForm = (flightId: string, flightNumber: string) => {
    setNoticeMessage(null)
    setBoardingGuideError(null)
    setBoardingGuideValues(createInitialBoardingGuideValues())
    setBoardingGuideFormState({ flightId, flightNumber })
  }

  const handleBoardingGuideFilesChange = (type: 'image' | 'video', fileList: FileList | null) => {
    const files = Array.from(fileList ?? [])

    setBoardingGuideValues((current) => ({
      ...current,
      imageFiles: type === 'image' ? files : current.imageFiles,
      videoFiles: type === 'video' ? files : current.videoFiles,
    }))
  }

  const handleBoardingGuideUrlChange = (type: 'image' | 'video', index: number, value: string) => {
    setBoardingGuideValues((current) => {
      const nextUrls = (type === 'image' ? current.imageUrls : current.videoUrls).map((item, itemIndex) => (
        itemIndex === index ? value : item
      ))

      return {
        ...current,
        imageUrls: type === 'image' ? nextUrls : current.imageUrls,
        videoUrls: type === 'video' ? nextUrls : current.videoUrls,
      }
    })
  }

  const handleAddBoardingGuideUrlField = (type: 'image' | 'video') => {
    setBoardingGuideValues((current) => ({
      ...current,
      imageUrls: type === 'image' ? [...current.imageUrls, ''] : current.imageUrls,
      videoUrls: type === 'video' ? [...current.videoUrls, ''] : current.videoUrls,
    }))
  }

  const handleRemoveBoardingGuideUrlField = (type: 'image' | 'video', index: number) => {
    setBoardingGuideValues((current) => {
      const source = type === 'image' ? current.imageUrls : current.videoUrls
      const next = source.filter((_, itemIndex) => itemIndex !== index)
      const normalized = next.length > 0 ? next : ['']

      return {
        ...current,
        imageUrls: type === 'image' ? normalized : current.imageUrls,
        videoUrls: type === 'video' ? normalized : current.videoUrls,
      }
    })
  }

  const handleSubmitBoardingGuide = async () => {
    if (!boardingGuideFormState) {
      return
    }

    const description = boardingGuideValues.description.trim()
    if (!description) {
      setBoardingGuideError(t('admin.flights.boardingGuide.validationDescription'))
      return
    }

    if (!boardingGuideValues.opensAtLocal || !boardingGuideValues.closesAtLocal) {
      setBoardingGuideError(t('admin.flights.boardingGuide.validationOpenCloseRequired'))
      return
    }

    const opensAt = new Date(boardingGuideValues.opensAtLocal)
    const closesAt = new Date(boardingGuideValues.closesAtLocal)

    if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
      setBoardingGuideError(t('admin.flights.boardingGuide.validationOpenCloseRequired'))
      return
    }

    if (closesAt.getTime() <= opensAt.getTime()) {
      setBoardingGuideError(t('admin.flights.boardingGuide.validationOpenCloseOrder'))
      return
    }

    const imageUrls = boardingGuideValues.imageUrls
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
    const videoUrls = boardingGuideValues.videoUrls
      .map((value) => value.trim())
      .filter((value) => value.length > 0)

    const invalidUrl = [...imageUrls, ...videoUrls].find((url) => !isAbsoluteUrl(url))
    if (invalidUrl) {
      setBoardingGuideError(t('admin.flights.boardingGuide.validationUrl'))
      return
    }

    setIsSavingBoardingGuide(true)
    setBoardingGuideError(null)

    try {
      const guide = await createBoardingGuide(boardingGuideFormState.flightId, {
        description,
        opensAt: opensAt.toISOString(),
        closesAt: closesAt.toISOString(),
      })

      for (const url of imageUrls) {
        await attachBoardingGuideMediaUrl(boardingGuideFormState.flightId, guide.id, 'image', url)
      }

      for (const url of videoUrls) {
        await attachBoardingGuideMediaUrl(boardingGuideFormState.flightId, guide.id, 'video', url)
      }

      for (const file of boardingGuideValues.imageFiles) {
        await attachBoardingGuideMediaFile(boardingGuideFormState.flightId, guide.id, 'image', file)
      }

      for (const file of boardingGuideValues.videoFiles) {
        await attachBoardingGuideMediaFile(boardingGuideFormState.flightId, guide.id, 'video', file)
      }

      closeBoardingGuideForm()
      setNoticeMessage(t('admin.flights.boardingGuide.createSuccess', { number: boardingGuideFormState.flightNumber }))
    } catch (error) {
      if (error instanceof ApiError) {
        setBoardingGuideError(error.message)
      } else {
        setBoardingGuideError(t('admin.flights.boardingGuide.saveError'))
      }
    } finally {
      setIsSavingBoardingGuide(false)
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

      {boardingGuideFormState ? (
        <div className="flights__form" aria-label={t('admin.flights.boardingGuide.aria')}>
          <h3>{t('admin.flights.boardingGuide.title', { number: boardingGuideFormState.flightNumber })}</h3>

          <div className="flights__field">
            <span>{t('admin.flights.boardingGuide.description')}</span>
            <input
              type="text"
              value={boardingGuideValues.description}
              onChange={(event) => {
                const value = event.target.value
                setBoardingGuideValues((current) => ({ ...current, description: value }))
              }}
              placeholder={t('admin.flights.boardingGuide.descriptionPlaceholder')}
              maxLength={300}
            />
          </div>

          <div className="flights__form-grid flights__form-grid--two">
            <label className="flights__field">
              <span>{t('admin.flights.boardingGuide.opensAt')}</span>
              <input
                type="datetime-local"
                value={boardingGuideValues.opensAtLocal}
                onChange={(event) => {
                  const value = event.target.value
                  setBoardingGuideValues((current) => ({ ...current, opensAtLocal: value }))
                }}
              />
            </label>

            <label className="flights__field">
              <span>{t('admin.flights.boardingGuide.closesAt')}</span>
              <input
                type="datetime-local"
                value={boardingGuideValues.closesAtLocal}
                onChange={(event) => {
                  const value = event.target.value
                  setBoardingGuideValues((current) => ({ ...current, closesAtLocal: value }))
                }}
              />
            </label>
          </div>

          <div className="flights__form-grid flights__form-grid--two">
            <div className="flights__field">
              <span>{t('admin.flights.boardingGuide.imageUrls')}</span>
              <div className="flights__url-list">
                {boardingGuideValues.imageUrls.map((url, index) => (
                  <div key={`image-url-${index}`} className="flights__url-item">
                    <input
                      type="url"
                      value={url}
                      onChange={(event) => handleBoardingGuideUrlChange('image', index, event.target.value)}
                      placeholder={t('admin.flights.boardingGuide.urlsPlaceholder')}
                    />
                    <button
                      type="button"
                      className="flights__url-remove"
                      onClick={() => handleRemoveBoardingGuideUrlField('image', index)}
                      aria-label={t('admin.flights.boardingGuide.removeUrl')}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="flights__url-add"
                  onClick={() => handleAddBoardingGuideUrlField('image')}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>{t('admin.flights.boardingGuide.addUrl')}</span>
                </button>
              </div>
            </div>

            <div className="flights__field">
              <span>{t('admin.flights.boardingGuide.videoUrls')}</span>
              <div className="flights__url-list">
                {boardingGuideValues.videoUrls.map((url, index) => (
                  <div key={`video-url-${index}`} className="flights__url-item">
                    <input
                      type="url"
                      value={url}
                      onChange={(event) => handleBoardingGuideUrlChange('video', index, event.target.value)}
                      placeholder={t('admin.flights.boardingGuide.urlsPlaceholder')}
                    />
                    <button
                      type="button"
                      className="flights__url-remove"
                      onClick={() => handleRemoveBoardingGuideUrlField('video', index)}
                      aria-label={t('admin.flights.boardingGuide.removeUrl')}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="flights__url-add"
                  onClick={() => handleAddBoardingGuideUrlField('video')}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>{t('admin.flights.boardingGuide.addUrl')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flights__form-grid flights__form-grid--two">
            <div className="flights__field">
              <span>{t('admin.flights.boardingGuide.imageFiles')}</span>
              <div className="flights__file-upload">
                <input
                  id="boarding-guide-images-input"
                  className="flights__file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => handleBoardingGuideFilesChange('image', event.target.files)}
                />
                <label htmlFor="boarding-guide-images-input" className="flights__file-picker">
                  <Upload size={15} aria-hidden="true" />
                  <span>{t('admin.flights.boardingGuide.imageFiles')}</span>
                </label>
                <small className="flights__hint">
                  {boardingGuideValues.imageFiles.length > 0
                    ? t('admin.flights.boardingGuide.filesSelected', { count: boardingGuideValues.imageFiles.length })
                    : t('admin.flights.boardingGuide.noFilesSelected')}
                </small>
              </div>
            </div>

            <div className="flights__field">
              <span>{t('admin.flights.boardingGuide.videoFiles')}</span>
              <div className="flights__file-upload">
                <input
                  id="boarding-guide-videos-input"
                  className="flights__file-input"
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(event) => handleBoardingGuideFilesChange('video', event.target.files)}
                />
                <label htmlFor="boarding-guide-videos-input" className="flights__file-picker">
                  <Upload size={15} aria-hidden="true" />
                  <span>{t('admin.flights.boardingGuide.videoFiles')}</span>
                </label>
                <small className="flights__hint">
                  {boardingGuideValues.videoFiles.length > 0
                    ? t('admin.flights.boardingGuide.filesSelected', { count: boardingGuideValues.videoFiles.length })
                    : t('admin.flights.boardingGuide.noFilesSelected')}
                </small>
              </div>
            </div>
          </div>

          <p className="flights__hint">{t('admin.flights.boardingGuide.mediaHint')}</p>

          {boardingGuideError ? <p className="flights__hint flights__hint--error" role="alert">{boardingGuideError}</p> : null}

          <div className="flights__form-actions">
            <button
              type="button"
              className="flights__button flights__button--ghost"
              onClick={closeBoardingGuideForm}
              disabled={isSavingBoardingGuide}
            >
              {t('admin.flights.cancel')}
            </button>
            <button
              type="button"
              className="flights__button flights__button--primary"
              onClick={() => { void handleSubmitBoardingGuide() }}
              disabled={isSavingBoardingGuide}
            >
              {isSavingBoardingGuide ? t('admin.flights.boardingGuide.saving') : t('admin.flights.boardingGuide.save')}
            </button>
          </div>
        </div>
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
                      className="flights__icon-button flights__icon-button--accent"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleOpenBoardingGuideForm(flight.id, flight.flightNumber)
                      }}
                      aria-label={t('admin.flights.boardingGuide.add')}
                      title={t('admin.flights.boardingGuide.add')}
                    >
                      <ClipboardList size={15} aria-hidden="true" />
                    </button>
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
