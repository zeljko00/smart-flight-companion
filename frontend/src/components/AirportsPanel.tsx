import { useEffect, useState, type FormEvent } from 'react'
import { Loader2, MapPin, Plus, RefreshCw, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../services/apiClient'
import { airportsService, type AirportDto } from '../services/airportsService'
import { AirportLocationDialog, AirportLocationPicker, type MapLocation } from './AirportMaps'
import '../style/AirportsPanel.css'

const SEARCH_DEBOUNCE_MS = 300

type AirportFormValues = {
  name: string
  iata: string
  city: string
  country: string
  description: string
}

const EMPTY_FORM: AirportFormValues = {
  name: '',
  iata: '',
  city: '',
  country: '',
  description: '',
}

export function AirportsPanel() {
  const { t } = useTranslation()
  const [searchValue, setSearchValue] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [airports, setAirports] = useState<AirportDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState<AirportFormValues>(EMPTY_FORM)
  const [location, setLocation] = useState<MapLocation | null>(null)
  const [mapAirport, setMapAirport] = useState<AirportDto | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedQuery(searchValue.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [searchValue])

  useEffect(() => {
    const controller = new AbortController()

    void (async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const result = appliedQuery
          ? await airportsService.search(appliedQuery, controller.signal)
          : await airportsService.getAll(controller.signal)

        if (!controller.signal.aborted) {
          setAirports(result)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorMessage(error instanceof ApiError ? error.message : t('admin.airports.loadError'))
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
  }, [appliedQuery, reloadToken, t])

  const updateField = (field: keyof AirportFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setForm(EMPTY_FORM)
    setLocation(null)
    setFormError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    setNoticeMessage(null)

    const iata = form.iata.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(iata)) {
      setFormError(t('admin.airports.form.invalidIata'))
      return
    }

    if (!location) {
      setFormError(t('admin.airports.form.locationRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      const created = await airportsService.create({
        name: form.name.trim(),
        iata,
        city: form.city.trim(),
        country: form.country.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        description: form.description.trim(),
      })

      closeForm()
      setNoticeMessage(t('admin.airports.createSuccess', { name: created.name }))
      setReloadToken((current) => current + 1)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setFormError(t('admin.airports.form.duplicate'))
      } else if (error instanceof ApiError && error.status === 422) {
        setFormError(t('admin.airports.form.addressUnresolved'))
      } else {
        setFormError(error instanceof ApiError ? error.message : t('admin.airports.form.createError'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="airports" aria-label={t('admin.airports.aria')}>
      <div className="airports__toolbar">
        <label className="airports__search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={searchValue}
            placeholder={t('admin.airports.searchPlaceholder')}
            aria-label={t('admin.airports.searchLabel')}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          {searchValue ? (
            <button
              type="button"
              className="airports__search-clear"
              onClick={() => setSearchValue('')}
              aria-label={t('admin.airports.clearSearch')}
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </label>

        <div className="airports__actions">
          <button
            type="button"
            className="airports__button airports__button--secondary"
            onClick={() => setReloadToken((current) => current + 1)}
            disabled={isLoading}
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>{t('admin.airports.refresh')}</span>
          </button>
          <button
            type="button"
            className="airports__button airports__button--primary"
            onClick={() => (isFormOpen ? closeForm() : setIsFormOpen(true))}
            aria-expanded={isFormOpen}
          >
            {isFormOpen ? <X size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
            <span>{isFormOpen ? t('admin.airports.cancel') : t('admin.airports.add')}</span>
          </button>
        </div>
      </div>

      {isFormOpen ? (
        <form className="airports__form" onSubmit={(event) => { void handleSubmit(event) }} aria-label={t('admin.airports.form.aria')}>
          <h3>{t('admin.airports.form.title')}</h3>

          <div className="airports__form-grid">
            <label className="airports__field airports__field--wide">
              <span>{t('admin.airports.columns.name')}</span>
              <input
                type="text"
                value={form.name}
                maxLength={255}
                required
                onChange={(event) => updateField('name', event.target.value)}
              />
            </label>

            <label className="airports__field">
              <span>{t('admin.airports.columns.iata')}</span>
              <input
                type="text"
                value={form.iata}
                maxLength={3}
                required
                placeholder="BEG"
                pattern="[A-Za-z]{3}"
                onChange={(event) => updateField('iata', event.target.value.toUpperCase())}
              />
            </label>

            <label className="airports__field">
              <span>{t('admin.airports.columns.city')}</span>
              <input
                type="text"
                value={form.city}
                maxLength={50}
                required
                onChange={(event) => updateField('city', event.target.value)}
              />
            </label>

            <label className="airports__field">
              <span>{t('admin.airports.columns.country')}</span>
              <input
                type="text"
                value={form.country}
                maxLength={50}
                required
                onChange={(event) => updateField('country', event.target.value)}
              />
            </label>

            <div className="airports__field airports__field--full">
              <span>{t('admin.airports.form.location')}</span>
              <AirportLocationPicker value={location} onChange={setLocation} />
            </div>

            <label className="airports__field airports__field--full">
              <span>{t('admin.airports.form.description')}</span>
              <textarea
                value={form.description}
                maxLength={2000}
                rows={3}
                onChange={(event) => updateField('description', event.target.value)}
              />
            </label>
          </div>

          {formError ? (
            <p className="airports__message airports__message--error" role="alert">{formError}</p>
          ) : null}

          <div className="airports__form-actions">
            <button
              type="button"
              className="airports__button airports__button--ghost"
              onClick={closeForm}
              disabled={isSubmitting}
            >
              {t('admin.airports.cancel')}
            </button>
            <button type="submit" className="airports__button airports__button--primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 size={14} className="airports__spinner" aria-hidden="true" />
              ) : (
                <Plus size={14} aria-hidden="true" />
              )}
              <span>{isSubmitting ? t('admin.airports.form.saving') : t('admin.airports.form.save')}</span>
            </button>
          </div>
        </form>
      ) : null}

      {noticeMessage ? (
        <p className="airports__message airports__message--success" role="status">{noticeMessage}</p>
      ) : null}

      {errorMessage ? (
        <p className="airports__message airports__message--error" role="alert">{errorMessage}</p>
      ) : null}

      {isLoading && airports.length === 0 && !errorMessage ? (
        <p className="airports__message">{t('admin.airports.loading')}</p>
      ) : null}

      {!isLoading && !errorMessage && airports.length === 0 ? (
        <p className="airports__message">
          {appliedQuery ? t('admin.airports.emptySearch') : t('admin.airports.empty')}
        </p>
      ) : null}

      {!errorMessage && airports.length > 0 ? (
        <>
          <div className={`airports__table-wrap ${isLoading ? 'airports__table-wrap--loading' : ''}`} aria-busy={isLoading}>
            <table className="airports__table" aria-label={t('admin.airports.tableAria')}>
              <thead>
                <tr>
                  <th>{t('admin.airports.columns.iata')}</th>
                  <th>{t('admin.airports.columns.name')}</th>
                  <th>{t('admin.airports.columns.city')}</th>
                  <th>{t('admin.airports.columns.country')}</th>
                  <th>{t('admin.airports.columns.location')}</th>
                </tr>
              </thead>
              <tbody>
                {airports.map((airport) => (
                  <tr key={airport.id}>
                    <td><span className="airports__iata">{airport.iata}</span></td>
                    <td>
                      <p className="airports__name">{airport.name}</p>
                      {airport.address ? <p className="airports__meta">{airport.address}</p> : null}
                    </td>
                    <td>{airport.city}</td>
                    <td>{airport.country}</td>
                    <td className="airports__cell-actions">
                      <button
                        type="button"
                        className="airports__button airports__button--secondary airports__button--compact"
                        onClick={() => setMapAirport(airport)}
                      >
                        <MapPin size={14} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="airports__total">{t('admin.airports.total', { count: airports.length })}</p>
        </>
      ) : null}

      {mapAirport ? (
        <AirportLocationDialog
          title={`${mapAirport.name} (${mapAirport.iata})`}
          subtitle={`${mapAirport.city}, ${mapAirport.country}`}
          location={{ latitude: mapAirport.latitude, longitude: mapAirport.longitude }}
          onClose={() => setMapAirport(null)}
        />
      ) : null}
    </section>
  )
}
