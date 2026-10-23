import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { LatLngTuple } from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../services/apiClient'
import type { UserDto } from '../services/authService'
import { fetchFlightById, type FlightDetails } from '../services/flightsService'
import { AuthHeader } from '../components/AuthHeader'
import { UserInfo } from '../components/UserInfo'
import 'leaflet/dist/leaflet.css'
import '../style/FlightDetailsPage.css'

type FlightDetailsLocationState = {
  user?: UserDto
  homeFilters?: {
    airline: string
    start: string
    destination: string
    departureTime: string
    maxPrice: string
    status: string
    isFilterPanelOpen: boolean
  }
}

type DetailFieldProps = {
  label: string
  value: string
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div className="flight-details-page__field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function buildRouteArc(start: LatLngTuple, end: LatLngTuple): LatLngTuple[] {
  const [startLat, startLng] = start
  const [endLat, endLng] = end
  const avgLatRad = ((startLat + endLat) / 2) * (Math.PI / 180)
  const cosLat = Math.max(Math.cos(avgLatRad), 0.2)

  const dx = (endLng - startLng) * cosLat
  const dy = endLat - startLat
  const distance = Math.hypot(dx, dy)

  if (distance < 0.00001) {
    return [start, end]
  }

  const perpX = -dy / distance
  const perpY = dx / distance
  const bend = clamp(distance * 0.22, 0.8, 6)

  const midLat = (startLat + endLat) / 2
  const midLng = (startLng + endLng) / 2

  const controlLat = midLat + perpY * bend
  const controlLng = midLng + (perpX * bend) / cosLat

  const steps = 46
  const points: LatLngTuple[] = []

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const oneMinusT = 1 - t

    const lat = oneMinusT * oneMinusT * startLat + 2 * oneMinusT * t * controlLat + t * t * endLat
    const lng = oneMinusT * oneMinusT * startLng + 2 * oneMinusT * t * controlLng + t * t * endLng
    points.push([lat, lng])
  }

  return points
}

export function FlightDetailsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { flightId } = useParams<{ flightId: string }>()
  const locationState = (location.state as FlightDetailsLocationState | null) ?? null
  const user = locationState?.user ?? null
  const homeFilters = locationState?.homeFilters

  const [flight, setFlight] = useState<FlightDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!flightId) {
      setErrorMessage(t('flightDetails.notFound'))
      setIsLoading(false)
      return
    }

    let isDisposed = false

    void (async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const result = await fetchFlightById(flightId)
        if (!isDisposed) {
          setFlight(result)
        }
      } catch (error) {
        if (isDisposed) {
          return
        }

        if (error instanceof ApiError && error.status === 404) {
          setErrorMessage(t('flightDetails.notFound'))
        } else {
          setErrorMessage(t('flightDetails.loadError'))
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
  }, [flightId, t])

  const handleBack = () => {
    navigate('/home', {
      state: {
        user,
        homeFilters,
      },
    })
  }

  const handleLogout = () => {
    navigate('/', { replace: true })
  }

  const departureLatitude = flight?.departureAirport.latitude ?? null
  const departureLongitude = flight?.departureAirport.longitude ?? null
  const arrivalLatitude = flight?.arrivalAirport.latitude ?? null
  const arrivalLongitude = flight?.arrivalAirport.longitude ?? null

  const departureCoordinates: LatLngTuple | null =
    departureLatitude !== null && departureLongitude !== null
      ? [departureLatitude, departureLongitude]
      : null

  const arrivalCoordinates: LatLngTuple | null =
    arrivalLatitude !== null && arrivalLongitude !== null
      ? [arrivalLatitude, arrivalLongitude]
      : null

  const routeArc =
    departureCoordinates && arrivalCoordinates
      ? buildRouteArc(departureCoordinates, arrivalCoordinates)
      : null

  const mapBounds: [LatLngTuple, LatLngTuple] | null = routeArc
    ? [
        [
          Math.min(...routeArc.map(([lat]) => lat)),
          Math.min(...routeArc.map(([, lng]) => lng)),
        ],
        [
          Math.max(...routeArc.map(([lat]) => lat)),
          Math.max(...routeArc.map(([, lng]) => lng)),
        ],
      ]
    : null

  return (
    <main className="flight-details-page">
      <div className="flight-details-page__ambient" aria-hidden="true" />

      <section className="flight-details-page__shell" aria-label={t('flightDetails.sectionAria')}>
        <article className="flight-details-page__panel" aria-label={t('flightDetails.panelAria')}>
          <AuthHeader />
          <UserInfo user={user} onLogout={handleLogout} />

          <header className="flight-details-page__header">
            <button type="button" className="flight-details-page__back" onClick={handleBack}>
              <ArrowLeft size={16} aria-hidden="true" />
              <span>{t('flightDetails.back')}</span>
            </button>

            <div className="flight-details-page__headline">
              <h2>{t('flightDetails.title')}</h2>
              <p>{t('flightDetails.subtitle')}</p>
            </div>
          </header>

          {isLoading ? <p className="flight-details-page__status">{t('flightDetails.loading')}</p> : null}

          {!isLoading && errorMessage ? (
            <p className="flight-details-page__status flight-details-page__status--error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {!isLoading && !errorMessage && flight ? (
            <div className="flight-details-page__content">
              <section className="flight-details-page__overview" aria-label={t('flightDetails.overviewAria')}>
                <article className="flight-details-page__overview-card flight-details-page__overview-card--flight">
                  <p>{t('flightDetails.fields.flightNumber')}</p>
                  <strong>{flight.flightNumber}</strong>
                </article>
                <article className="flight-details-page__overview-card flight-details-page__overview-card--airline">
                  <p>{t('flightDetails.fields.airline')}</p>
                  <strong>{flight.airline}</strong>
                  <span>{flight.aircraft}</span>
                </article>
                <article className="flight-details-page__overview-card flight-details-page__overview-card--status">
                  <p>{t('flightDetails.fields.status')}</p>
                  <strong>{t(`common.${flight.statusLabel}`)}</strong>
                  <span>{t('flightDetails.fields.gate')}: {flight.gate}</span>
                </article>
                <article className="flight-details-page__overview-card flight-details-page__overview-card--route">
                  <p>{t('flightDetails.fields.route')}</p>
                  <strong>{flight.departureAirport.iata} → {flight.arrivalAirport.iata}</strong>
                </article>
              </section>

              <section className="flight-details-page__grid" aria-label={t('flightDetails.technicalAria')}>
                <article className="flight-details-page__card flight-details-page__card--map">
                  <h3>{t('flightDetails.sections.routeMap')}</h3>

                  {departureCoordinates && arrivalCoordinates && routeArc && mapBounds ? (
                    <div className="flight-details-page__map-wrap">
                      <MapContainer
                        bounds={mapBounds}
                        scrollWheelZoom={false}
                        className="flight-details-page__map"
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <Marker position={departureCoordinates}>
                          <Popup>
                            {flight.departureAirport.iata} - {flight.departureAirport.name}
                          </Popup>
                        </Marker>

                        <Marker position={arrivalCoordinates}>
                          <Popup>
                            {flight.arrivalAirport.iata} - {flight.arrivalAirport.name}
                          </Popup>
                        </Marker>

                        <Polyline
                          positions={routeArc}
                          pathOptions={{
                            color: '#2563EB',
                            weight: 3,
                            opacity: 0.9,
                          }}
                        />
                      </MapContainer>
                    </div>
                  ) : (
                    <p className="flight-details-page__map-fallback">{t('flightDetails.mapUnavailable')}</p>
                  )}
                </article>

                <article className="flight-details-page__card">
                  <h3>{t('flightDetails.sections.technical')}</h3>
                  <dl>
                    <DetailField label={t('flightDetails.fields.terminal')} value={flight.terminal?.toString() ?? 'TBD'} />
                    <DetailField label={t('flightDetails.fields.gate')} value={flight.gate} />
                    <DetailField label={t('flightDetails.fields.aircraft')} value={flight.aircraft} />
                    <DetailField label={t('flightDetails.fields.seatCapacity')} value={flight.seatCapacity?.toString() ?? 'TBD'} />
                    <DetailField label={t('flightDetails.fields.seatsFree')} value={flight.seatsFree?.toString() ?? 'TBD'} />
                  </dl>
                </article>

                <article className="flight-details-page__card">
                  <h3>{t('flightDetails.sections.schedule')}</h3>
                  <dl>
                    <DetailField label={t('flightDetails.fields.scheduledDeparture')} value={flight.scheduledDepartureLabel} />
                    <DetailField label={t('flightDetails.fields.scheduledArrival')} value={flight.scheduledArrivalLabel} />
                    <DetailField label={t('flightDetails.fields.departure')} value={flight.departureLabel} />
                    <DetailField label={t('flightDetails.fields.arrival')} value={flight.arrivalLabel} />
                    <DetailField label={t('flightDetails.fields.duration')} value={flight.durationLabel} />

                  </dl>
                </article>

                <article className="flight-details-page__card">
                  <h3>{t('flightDetails.sections.pricing')}</h3>
                  <dl>
                    <DetailField label={t('flightDetails.fields.economyPrice')} value={flight.economyPriceLabel === 'N/A' ? t('home.columns.noPrice') : flight.economyPriceLabel} />
                    <DetailField label={t('flightDetails.fields.premiumEconomyPrice')} value={flight.premiumEconomyPriceLabel === 'N/A' ? t('home.columns.noPrice') : flight.premiumEconomyPriceLabel} />
                    <DetailField label={t('flightDetails.fields.businessPrice')} value={flight.businessPriceLabel === 'N/A' ? t('home.columns.noPrice') : flight.businessPriceLabel} />
                    <DetailField label={t('flightDetails.fields.firstClassPrice')} value={flight.firstClassPriceLabel === 'N/A' ? t('home.columns.noPrice') : flight.firstClassPriceLabel} />
                  </dl>
                </article>

                <article className="flight-details-page__card">
                  <h3>{t('flightDetails.sections.airports')}</h3>
                  <dl>
                    <DetailField
                      label={t('flightDetails.fields.departureAirport')}
                      value={`${flight.departureAirport.iata} · ${flight.departureAirport.name}`}
                    />
                    <DetailField label={t('flightDetails.fields.departureAirportAddress')} value={flight.departureAirport.address} />
                    <DetailField
                      label={t('flightDetails.fields.arrivalAirport')}
                      value={`${flight.arrivalAirport.iata} · ${flight.arrivalAirport.name}`}
                    />
                    <DetailField label={t('flightDetails.fields.arrivalAirportAddress')} value={flight.arrivalAirport.address} />
                  </dl>
                </article>
              </section>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  )
}
