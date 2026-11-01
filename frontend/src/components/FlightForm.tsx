import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2, Save, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { airportsService, type AirportDto } from '../services/airportsService'
import {
  FLIGHT_STATUS_OPTIONS,
  type FlightEditData,
  type FlightRequest,
} from '../services/flightsService'

type FlightFormValues = {
  flightNumber: string
  airline: string
  aircraft: string
  departureAirportIata: string
  arrivalAirportIata: string
  status: string
  terminal: string
  gate: string
  seatCapacity: string
  scheduledDepartureTime: string
  scheduledArrivalTime: string
  departureTime: string
  arrivalTime: string
  economyPrice: string
  premiumEconomyPrice: string
  businessPrice: string
  firstClassPrice: string
}

type FlightFormProps = {
  initial: FlightEditData | null
  isSaving: boolean
  errorMessage: string | null
  onSubmit: (request: FlightRequest) => void
  onCancel: () => void
}

const pad = (value: number) => String(value).padStart(2, '0')

const MAX_AIRPORT_NAME_LENGTH = 50

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trimEnd()}…` : value
}

function toLocalInput(iso: string): string {
  const date = new Date(iso)
  if (!iso || Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIso(value: string): string | undefined {
  if (!value) {
    return undefined
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function priceToInput(value: number | null): string {
  return value === null ? '' : String(value)
}

function buildInitialValues(initial: FlightEditData | null): FlightFormValues {
  return {
    flightNumber: initial?.flightNumber ?? '',
    airline: initial?.airline ?? '',
    aircraft: initial?.aircraft ?? '',
    departureAirportIata: initial?.departureAirportIata ?? '',
    arrivalAirportIata: initial?.arrivalAirportIata ?? '',
    status: initial?.status ?? 'Scheduled',
    terminal: initial ? String(initial.terminal) : '',
    gate: initial?.gate ?? '',
    seatCapacity: initial ? String(initial.seatCapacity) : '',
    scheduledDepartureTime: toLocalInput(initial?.scheduledDepartureTime ?? ''),
    scheduledArrivalTime: toLocalInput(initial?.scheduledArrivalTime ?? ''),
    departureTime: toLocalInput(initial?.departureTime ?? ''),
    arrivalTime: toLocalInput(initial?.arrivalTime ?? ''),
    economyPrice: priceToInput(initial?.economyPrice ?? null),
    premiumEconomyPrice: priceToInput(initial?.premiumEconomyPrice ?? null),
    businessPrice: priceToInput(initial?.businessPrice ?? null),
    firstClassPrice: priceToInput(initial?.firstClassPrice ?? null),
  }
}

// Blank means "no such fare class" (null); anything else must be a non-negative number.
function parsePrice(value: string): number | null | undefined {
  if (value.trim() === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

export function FlightForm({ initial, isSaving, errorMessage, onSubmit, onCancel }: FlightFormProps) {
  const { t } = useTranslation()
  const [values, setValues] = useState<FlightFormValues>(() => buildInitialValues(initial))
  const [validationError, setValidationError] = useState<string | null>(null)
  const isEdit = initial !== null
  const [airports, setAirports] = useState<AirportDto[]>([])
  const [airportsState, setAirportsState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      try {
        const result = await airportsService.getAll(controller.signal)
        if (!controller.signal.aborted) {
          setAirports(result)
          setAirportsState('ready')
        }
      } catch {
        if (!controller.signal.aborted) {
          setAirportsState('error')
        }
      }
    })()

    return () => {
      controller.abort()
    }
  }, [])

  const airportOptions = useMemo(
    () => [...airports].sort((a, b) => a.iata.localeCompare(b.iata)),
    [airports],
  )

  const renderAirportOptions = (excludedIata: string) => (
    <>
      <option value="">{t('admin.flights.form.selectAirport')}</option>
      {airportOptions.map((airport) => (
        <option
          key={airport.id}
          value={airport.iata}
          title={`${airport.iata} - ${airport.name}`}
          disabled={airport.iata === excludedIata}
        >
          {airport.iata} - {truncate(airport.name + ` (${airport.city}, ${airport.country})`, MAX_AIRPORT_NAME_LENGTH)}
        </option>
      ))}
    </>
  )

  const setField = (field: keyof FlightFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setValidationError(null)

    const departureIata = values.departureAirportIata.trim().toUpperCase()
    const arrivalIata = values.arrivalAirportIata.trim().toUpperCase()

    if (!departureIata || !arrivalIata) {
      setValidationError(t('admin.flights.form.airportRequired'))
      return
    }

    if (departureIata === arrivalIata) {
      setValidationError(t('admin.flights.form.sameAirports'))
      return
    }

    const scheduledDeparture = toIso(values.scheduledDepartureTime)
    const scheduledArrival = toIso(values.scheduledArrivalTime)
    const departure = toIso(values.departureTime)
    const arrival = toIso(values.arrivalTime)

    if (!scheduledDeparture || !scheduledArrival) {
      setValidationError(t('admin.flights.form.scheduleRequired'))
      return
    }

    if (Date.parse(scheduledArrival) <= Date.parse(scheduledDeparture)) {
      console.log(scheduledDeparture, scheduledArrival)
      setValidationError(t('admin.flights.form.invalidScheduledOrder'))
      return
    }

    // An empty actual time falls back to its scheduled time, mirroring the backend.
    const effectiveDeparture = departure ?? scheduledDeparture
    const effectiveArrival = arrival ?? scheduledArrival

    if (Date.parse(effectiveArrival) <= Date.parse(effectiveDeparture)) {
      setValidationError(t('admin.flights.form.invalidActualOrder'))
      return
    }

    const economyPrice = parsePrice(values.economyPrice)
    const premiumEconomyPrice = parsePrice(values.premiumEconomyPrice)
    const businessPrice = parsePrice(values.businessPrice)
    const firstClassPrice = parsePrice(values.firstClassPrice)

    if (
      economyPrice === undefined ||
      premiumEconomyPrice === undefined ||
      businessPrice === undefined ||
      firstClassPrice === undefined
    ) {
      setValidationError(t('admin.flights.form.invalidPrice'))
      return
    }

    onSubmit({
      flightNumber: values.flightNumber.trim().toUpperCase(),
      departureAirportIata: departureIata,
      arrivalAirportIata: arrivalIata,
      status: values.status,
      terminal: Number(values.terminal),
      gate: values.gate.trim(),
      airline: values.airline.trim(),
      aircraft: values.aircraft.trim(),
      seatCapacity: Number(values.seatCapacity),
      scheduledDepartureTime: scheduledDeparture,
      scheduledArrivalTime: scheduledArrival,
      departureTime: departure,
      arrivalTime: arrival,
      economyPrice,
      premiumEconomyPrice,
      businessPrice,
      firstClassPrice,
    })
  }

  const displayedError = validationError ?? errorMessage
  const airportsHint =
    airportsState === 'loading'
      ? t('admin.flights.form.airportsLoading')
      : airportsState === 'error'
        ? t('admin.flights.form.airportsLoadError')
        : airportOptions.length === 0
          ? t('admin.flights.form.airportsEmpty')
          : null

  return (
    <form className="flights__form" onSubmit={handleSubmit} aria-label={t('admin.flights.form.aria')}>
      <h3>{isEdit ? t('admin.flights.form.editTitle', { number: initial.flightNumber }) : t('admin.flights.form.createTitle')}</h3>

      <fieldset className="flights__fieldset" disabled={isSaving}>
        <legend>{t('admin.flights.form.generalSection')}</legend>
        <div className="flights__form-grid">
          <label className="flights__field">
            <span>{t('admin.flights.form.flightNumber')}</span>
            <input
              type="text"
              value={values.flightNumber}
              maxLength={10}
              required
              onChange={(event) => setField('flightNumber', event.target.value.toUpperCase())}
            />
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.airline')}</span>
            <input
              type="text"
              value={values.airline}
              maxLength={128}
              required
              onChange={(event) => setField('airline', event.target.value)}
            />
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.aircraft')}</span>
            <input
              type="text"
              value={values.aircraft}
              maxLength={128}
              required
              onChange={(event) => setField('aircraft', event.target.value)}
            />
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.departureAirport')}</span>
            <select
              value={values.departureAirportIata}
              required
              disabled={airportsState !== 'ready'}
              onChange={(event) => setField('departureAirportIata', event.target.value)}
            >
              {renderAirportOptions(values.arrivalAirportIata)}
            </select>
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.arrivalAirport')}</span>
            <select
              value={values.arrivalAirportIata}
              required
              disabled={airportsState !== 'ready'}
              onChange={(event) => setField('arrivalAirportIata', event.target.value)}
            >
              {renderAirportOptions(values.departureAirportIata)}
            </select>
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.status')}</span>
            <select value={values.status} onChange={(event) => setField('status', event.target.value)}>
              {FLIGHT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {t(`admin.flights.statuses.${status}`, { defaultValue: status })}
                </option>
              ))}
            </select>
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.terminal')}</span>
            <input
              type="number"
              value={values.terminal}
              min={0}
              max={99}
              step={1}
              required
              onChange={(event) => setField('terminal', event.target.value)}
            />
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.gate')}</span>
            <input
              type="text"
              value={values.gate}
              maxLength={10}
              required
              onChange={(event) => setField('gate', event.target.value)}
            />
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.seatCapacity')}</span>
            <input
              type="number"
              value={values.seatCapacity}
              min={1}
              max={1000}
              step={1}
              required
              onChange={(event) => setField('seatCapacity', event.target.value)}
            />
          </label>
        </div>
        {airportsHint ? (
          <p className={`flights__hint ${airportsState === 'error' ? 'flights__hint--error' : ''}`} role={airportsState === 'error' ? 'alert' : undefined}>
            {airportsHint}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="flights__fieldset" disabled={isSaving}>
        <legend>{t('admin.flights.form.scheduleSection')}</legend>
        <div className="flights__form-grid flights__form-grid--two">
          <label className="flights__field">
            <span>{t('admin.flights.form.scheduledDeparture')}</span>
            <input
              type="datetime-local"
              value={values.scheduledDepartureTime}
              required
              onChange={(event) => setField('scheduledDepartureTime', event.target.value)}
            />
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.scheduledArrival')}</span>
            <input
              type="datetime-local"
              value={values.scheduledArrivalTime}
              required
              onChange={(event) => setField('scheduledArrivalTime', event.target.value)}
            />
          </label>

          {/* A new flight has no actual times yet; the backend defaults them to the scheduled times. */}
          {isEdit ? (
            <>
              <label className="flights__field">
                <span>{t('admin.flights.form.actualDeparture')}</span>
                <input
                  type="datetime-local"
                  value={values.departureTime}
                  onChange={(event) => setField('departureTime', event.target.value)}
                />
              </label>

              <label className="flights__field">
                <span>{t('admin.flights.form.actualArrival')}</span>
                <input
                  type="datetime-local"
                  value={values.arrivalTime}
                  onChange={(event) => setField('arrivalTime', event.target.value)}
                />
              </label>
            </>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="flights__fieldset" disabled={isSaving}>
        <legend>{t('admin.flights.form.pricingSection')}</legend>
        <div className="flights__form-grid flights__form-grid--four">
          <label className="flights__field">
            <span>{t('admin.flights.form.economyPrice')}</span>
            <input
              type="number"
              value={values.economyPrice}
              min={0}
              step="0.01"
              onChange={(event) => setField('economyPrice', event.target.value)}
            />
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.premiumEconomyPrice')}</span>
            <input
              type="number"
              value={values.premiumEconomyPrice}
              min={0}
              step="0.01"
              onChange={(event) => setField('premiumEconomyPrice', event.target.value)}
            />
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.businessPrice')}</span>
            <input
              type="number"
              value={values.businessPrice}
              min={0}
              step="0.01"
              onChange={(event) => setField('businessPrice', event.target.value)}
            />
          </label>

          <label className="flights__field">
            <span>{t('admin.flights.form.firstClassPrice')}</span>
            <input
              type="number"
              value={values.firstClassPrice}
              min={0}
              step="0.01"
              onChange={(event) => setField('firstClassPrice', event.target.value)}
            />
          </label>
        </div>
        <p className="flights__hint">{t('admin.flights.form.pricesHint')}</p>
      </fieldset>

      {displayedError ? (
        <p className="flights__message flights__message--error" role="alert">{displayedError}</p>
      ) : null}

      <div className="flights__form-actions">
        <button type="button" className="flights__button flights__button--ghost" onClick={onCancel} disabled={isSaving}>
          <X size={14} aria-hidden="true" />
          <span>{t('admin.flights.cancel')}</span>
        </button>
        <button type="submit" className="flights__button flights__button--primary" disabled={isSaving}>
          {isSaving ? <Loader2 size={14} className="flights__spinner" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
          <span>{isSaving ? t('admin.flights.form.saving') : t('admin.flights.form.save')}</span>
        </button>
      </div>
    </form>
  )
}
