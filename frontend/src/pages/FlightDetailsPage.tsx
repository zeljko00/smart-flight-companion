import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import type { LatLngTuple } from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../services/apiClient'
import type { UserDto } from '../services/authService'
import {
  createComment,
  fetchCommentsByFlight,
  type FlightComment,
} from '../services/commentsService'
import {
  createBoardingPass,
  type SeatType,
} from '../services/boardingPassesService'
import {
  fetchDestinationWeatherForecast,
  type CityWeatherForecast,
} from '../services/weatherService'
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
    page?: number
    pageSize?: number
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

type WeatherPresentation = {
  icon: LucideIcon
  labelKey: string
}

function getWeatherPresentation(code: number): WeatherPresentation {
  if (code === 0) {
    return { icon: Sun, labelKey: 'flightDetails.weather.labels.clearSky' }
  }

  if (code === 1) {
    return { icon: CloudSun, labelKey: 'flightDetails.weather.labels.mainlyClear' }
  }

  if (code === 2) {
    return { icon: CloudSun, labelKey: 'flightDetails.weather.labels.partlyCloudy' }
  }

  if (code === 3) {
    return { icon: Cloud, labelKey: 'flightDetails.weather.labels.overcast' }
  }

  if (code === 45 || code === 48) {
    return { icon: CloudFog, labelKey: 'flightDetails.weather.labels.fog' }
  }

  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) {
    return { icon: CloudDrizzle, labelKey: 'flightDetails.weather.labels.drizzle' }
  }

  if (
    code === 61 ||
    code === 63 ||
    code === 65 ||
    code === 66 ||
    code === 67 ||
    code === 80 ||
    code === 81 ||
    code === 82
  ) {
    return { icon: CloudRain, labelKey: 'flightDetails.weather.labels.rain' }
  }

  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) {
    return { icon: CloudSnow, labelKey: 'flightDetails.weather.labels.snow' }
  }

  if (code === 95 || code === 96 || code === 99) {
    return { icon: CloudLightning, labelKey: 'flightDetails.weather.labels.thunderstorm' }
  }

  return { icon: Cloud, labelKey: 'flightDetails.weather.labels.unknown' }
}

export function FlightDetailsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { flightId } = useParams<{ flightId: string }>()
  const locationState = (location.state as FlightDetailsLocationState | null) ?? null
  const user = locationState?.user ?? null
  const homeFilters = locationState?.homeFilters

  const [flight, setFlight] = useState<FlightDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [comments, setComments] = useState<FlightComment[]>([])
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [commentsErrorMessage, setCommentsErrorMessage] = useState<string | null>(null)
  const [newCommentContent, setNewCommentContent] = useState('')
  const [submitCommentErrorMessage, setSubmitCommentErrorMessage] = useState<string | null>(null)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [selectedSeatType, setSelectedSeatType] = useState<SeatType>('economy')
  const [isPurchaseConfirmed, setIsPurchaseConfirmed] = useState(false)
  const [isPurchasingBoardingPass, setIsPurchasingBoardingPass] = useState(false)
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null)
  const [purchaseErrorMessage, setPurchaseErrorMessage] = useState<string | null>(null)
  const [weatherForecast, setWeatherForecast] = useState<CityWeatherForecast[]>([])
  const [isWeatherLoading, setIsWeatherLoading] = useState(false)
  const [weatherErrorMessage, setWeatherErrorMessage] = useState<string | null>(null)

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

  useEffect(() => {
    if (!flightId) {
      setComments([])
      setCommentsErrorMessage(null)
      setIsCommentsLoading(false)
      return
    }

    let isDisposed = false

    void (async () => {
      setIsCommentsLoading(true)
      setCommentsErrorMessage(null)

      try {
        const result = await fetchCommentsByFlight(flightId)
        if (!isDisposed) {
          setComments(result)
        }
      } catch {
        if (!isDisposed) {
          setCommentsErrorMessage(t('flightDetails.comments.loadError'))
        }
      } finally {
        if (!isDisposed) {
          setIsCommentsLoading(false)
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

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!flightId) {
      return
    }

    const normalizedContent = newCommentContent.trim()
    if (!normalizedContent) {
      setSubmitCommentErrorMessage(t('flightDetails.comments.validationRequired'))
      return
    }

    setIsSubmittingComment(true)
    setSubmitCommentErrorMessage(null)

    try {
      const createdComment = await createComment({
        flightId,
        content: normalizedContent,
      })

      setComments((previousComments) => [...previousComments, createdComment])
      setNewCommentContent('')
    } catch {
      setSubmitCommentErrorMessage(t('flightDetails.comments.submitError'))
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const currentUserFullName = user ? `${user.firstName} ${user.lastName}`.trim().toLowerCase() : null

  const formatCommentDate = (value: string) => {
    const parsedDate = new Date(value)

    if (Number.isNaN(parsedDate.getTime())) {
      return t('flightDetails.comments.justNow')
    }

    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsedDate)
  }

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatWeatherDate = (value: string) => {
    const parsedDate = new Date(value)

    if (Number.isNaN(parsedDate.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
    }).format(parsedDate)
  }

  const formatTemperature = (value: number) => {
    return new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value)
  }

  const seatOffers: Array<{ seat: SeatType; label: string; price: number; priceLabel: string }> = flight
    ? [
        {
          seat: 'economy',
          label: t('flightDetails.boardingPass.seats.economy'),
          price: flight.economyPriceValue,
        },
        {
          seat: 'premiumEconomy',
          label: t('flightDetails.boardingPass.seats.premiumEconomy'),
          price: flight.premiumEconomyPriceValue,
        },
        {
          seat: 'business',
          label: t('flightDetails.boardingPass.seats.business'),
          price: flight.businessPriceValue,
        },
        {
          seat: 'firstClass',
          label: t('flightDetails.boardingPass.seats.firstClass'),
          price: flight.firstClassPriceValue,
        },
      ]
        .filter((offer): offer is { seat: SeatType; label: string; price: number } =>
          typeof offer.price === 'number' && Number.isFinite(offer.price) && offer.price > 0,
        )
        .map((offer) => ({
          ...offer,
          priceLabel: formatPrice(offer.price),
        }))
    : []

  const activeSeatOffer = seatOffers.find((offer) => offer.seat === selectedSeatType) ?? seatOffers[0] ?? null
  const seatsLeft = typeof flight?.seatsFree === 'number' ? Math.max(0, flight.seatsFree) : null
  const seatCapacity = typeof flight?.seatCapacity === 'number' ? Math.max(0, flight.seatCapacity) : null
  const seatsAvailabilityLabel =
    seatsLeft === null || seatCapacity === null
      ? 'TBD'
      : `${seatsLeft}/${seatCapacity}`
  const isSoldOut = seatsLeft === 0

  const handleBuyBoardingPass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!flightId) {
      return
    }

    if (seatOffers.length === 0) {
      setPurchaseErrorMessage(t('flightDetails.boardingPass.unavailable'))
      return
    }

    if (isSoldOut) {
      setPurchaseErrorMessage(t('flightDetails.boardingPass.soldOut'))
      return
    }

    if (!isPurchaseConfirmed) {
      setPurchaseErrorMessage(t('flightDetails.boardingPass.confirmRequired'))
      return
    }

    const seatToBuy = activeSeatOffer?.seat ?? selectedSeatType
    setIsPurchasingBoardingPass(true)
    setPurchaseErrorMessage(null)
    setPurchaseSuccessMessage(null)

    try {
      const boardingPass = await createBoardingPass(flightId, seatToBuy)

      try {
        const refreshedFlight = await fetchFlightById(flightId)
        setFlight(refreshedFlight)
      } catch {
        // Purchase succeeded; keep success flow even if refresh fails.
      }

      const seatLabel = t(`flightDetails.boardingPass.seats.${boardingPass.seat}`)
      const priceLabel =
        typeof boardingPass.price === 'number'
          ? formatPrice(boardingPass.price)
          : activeSeatOffer?.priceLabel ?? t('home.columns.noPrice')

      setPurchaseSuccessMessage(
        t('flightDetails.boardingPass.purchaseSuccess', {
          seat: seatLabel,
          price: priceLabel,
        }),
      )
      setIsPurchaseConfirmed(false)
    } catch {
      setPurchaseErrorMessage(t('flightDetails.boardingPass.purchaseError'))
    } finally {
      setIsPurchasingBoardingPass(false)
    }
  }

  useEffect(() => {
    if (!seatOffers.some((offer) => offer.seat === selectedSeatType) && seatOffers.length > 0) {
      setSelectedSeatType(seatOffers[0].seat)
    }
  }, [seatOffers, selectedSeatType])

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

  useEffect(() => {
    if (arrivalLatitude === null || arrivalLongitude === null) {
      setWeatherForecast([])
      setIsWeatherLoading(false)
      setWeatherErrorMessage(null)
      return
    }

    let isDisposed = false

    void (async () => {
      setIsWeatherLoading(true)
      setWeatherErrorMessage(null)

      try {
        const result = await fetchDestinationWeatherForecast(arrivalLatitude, arrivalLongitude)
        if (!isDisposed) {
          setWeatherForecast(result)
        }
      } catch (error) {
        if (isDisposed) {
          return
        }

        if (error instanceof ApiError && error.status === 404) {
          setWeatherForecast([])
          return
        }

        setWeatherErrorMessage(t('flightDetails.weather.loadError'))
      } finally {
        if (!isDisposed) {
          setIsWeatherLoading(false)
        }
      }
    })()

    return () => {
      isDisposed = true
    }
  }, [arrivalLatitude, arrivalLongitude, t])

  return (
    <main className="flight-details-page">
      <div className="flight-details-page__ambient" aria-hidden="true" />

      <section className="flight-details-page__shell" aria-label={t('flightDetails.sectionAria')}>
        <article className="flight-details-page__panel" aria-label={t('flightDetails.panelAria')}>
          <AuthHeader />
          <UserInfo user={user} onLogout={handleLogout} />

          <header className="flight-details-page__header">
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

                <article className="flight-details-page__card flight-details-page__card--weather">
                  <h3>{t('flightDetails.sections.weather')}</h3>

                  {isWeatherLoading ? (
                    <p className="flight-details-page__status">{t('flightDetails.weather.loading')}</p>
                  ) : null}

                  {!isWeatherLoading && weatherErrorMessage ? (
                    <p className="flight-details-page__status flight-details-page__status--error" role="alert">
                      {weatherErrorMessage}
                    </p>
                  ) : null}

                  {!isWeatherLoading && !weatherErrorMessage && weatherForecast.length === 0 ? (
                    <p className="flight-details-page__map-fallback">{t('flightDetails.weather.empty')}</p>
                  ) : null}

                  {!isWeatherLoading && !weatherErrorMessage && weatherForecast.length > 0 ? (
                    <div className="flight-details-page__weather-grid">
                      {weatherForecast.map((city) => (
                        <section
                          key={`${city.city}`}
                          className="flight-details-page__weather-city"
                          aria-label={`${city.city}`}
                        >
                          <header className="flight-details-page__weather-city-header">
                            <strong>{city.city}</strong>
                            <span>{city.country}</span>
                          </header>

                          <ul className="flight-details-page__weather-list">
                            {city.forecast.map((day) => (
                              <li key={`${city.city}-${day.date}`} className="flight-details-page__weather-item">
                                <div className="flight-details-page__weather-topline">
                                  <p className="flight-details-page__weather-date">{formatWeatherDate(day.date)}</p>
                                  <div className="flight-details-page__weather-condition">
                                    {(() => {
                                      const presentation = getWeatherPresentation(day.weatherCode)
                                      const WeatherIcon = presentation.icon

                                      return (
                                        <>
                                          <span>{t(presentation.labelKey)}</span>
                                          <WeatherIcon className="flight-details-page__weather-icon" aria-hidden="true" />
                                        </>
                                      )
                                    })()}
                                  </div>
                                </div>
                                <p className="flight-details-page__weather-meta">
                                  {t('flightDetails.weather.min')}: {formatTemperature(day.minTemperatureCelsius)} C
                                </p>
                                <p className="flight-details-page__weather-meta">
                                  {t('flightDetails.weather.max')}: {formatTemperature(day.maxTemperatureCelsius)} C
                                </p>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  ) : null}
                </article>

                <article className="flight-details-page__card flight-details-page__card--boarding-pass">
                  <h3>{t('flightDetails.sections.boardingPass')}</h3>

                  {seatOffers.length === 0 ? (
                    <p className="flight-details-page__map-fallback">{t('flightDetails.boardingPass.unavailable')}</p>
                  ) : (
                    <form className="flight-details-page__boarding-pass-form" onSubmit={handleBuyBoardingPass}>
                      <label className="flight-details-page__boarding-pass-field">
                        <span>{t('flightDetails.boardingPass.seatType')}</span>
                        <select
                          value={selectedSeatType}
                          onChange={(event) => {
                            setSelectedSeatType(event.target.value as SeatType)
                            setIsPurchaseConfirmed(false)
                            setPurchaseErrorMessage(null)
                            setPurchaseSuccessMessage(null)
                          }}
                          disabled={isPurchasingBoardingPass || seatOffers.length === 0}
                        >
                          {seatOffers.map((offer) => (
                            <option key={offer.seat} value={offer.seat}>
                              {offer.label} - {offer.priceLabel}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="flight-details-page__boarding-pass-price">
                        <span>{t('flightDetails.boardingPass.price')}</span>
                        <strong>{activeSeatOffer?.priceLabel ?? t('home.columns.noPrice')}</strong>
                      </div>

                      <div className="flight-details-page__boarding-pass-availability">
                        <span>{t('flightDetails.boardingPass.seatsLeft')}</span>
                        <strong>{seatsAvailabilityLabel}</strong>
                      </div>

                      {isSoldOut ? (
                        <p className="flight-details-page__purchase-note flight-details-page__purchase-note--error" role="status">
                          {t('flightDetails.boardingPass.soldOut')}
                        </p>
                      ) : null}

                      <label className="flight-details-page__boarding-pass-confirm">
                        <input
                          type="checkbox"
                          checked={isPurchaseConfirmed}
                          onChange={(event) => {
                            setIsPurchaseConfirmed(event.target.checked)
                            if (purchaseErrorMessage) {
                              setPurchaseErrorMessage(null)
                            }
                          }}
                          disabled={isPurchasingBoardingPass || seatOffers.length === 0}
                        />
                        <span>{t('flightDetails.boardingPass.confirmLabel')}</span>
                      </label>

                      {purchaseErrorMessage ? (
                        <p className="flight-details-page__purchase-note flight-details-page__purchase-note--error" role="alert">
                          {purchaseErrorMessage}
                        </p>
                      ) : null}

                      {purchaseSuccessMessage ? (
                        <p className="flight-details-page__purchase-note flight-details-page__purchase-note--success" role="status">
                          {purchaseSuccessMessage}
                        </p>
                      ) : null}

                      <button
                        type="submit"
                        className="flight-details-page__comment-submit"
                        disabled={isPurchasingBoardingPass || seatOffers.length === 0 || !isPurchaseConfirmed || isSoldOut}
                      >
                        {isPurchasingBoardingPass
                          ? t('flightDetails.boardingPass.purchasing')
                          : t('flightDetails.boardingPass.purchase')}
                      </button>
                    </form>
                  )}
                </article>
                <article className="flight-details-page__card flight-details-page__card--comments">
                  <div className="flight-details-page__comments-header">
                    <h3>{t('flightDetails.sections.comments')}</h3>
                    <span>{t('flightDetails.comments.count', { count: comments.length })}</span>
                  </div>

                  {isCommentsLoading ? (
                    <p className="flight-details-page__status">{t('flightDetails.comments.loading')}</p>
                  ) : null}

                  {!isCommentsLoading && commentsErrorMessage ? (
                    <p className="flight-details-page__status flight-details-page__status--error" role="alert">
                      {commentsErrorMessage}
                    </p>
                  ) : null}

                  {!isCommentsLoading && !commentsErrorMessage && comments.length === 0 ? (
                    <p className="flight-details-page__map-fallback">{t('flightDetails.comments.empty')}</p>
                  ) : null}

                  {!isCommentsLoading && !commentsErrorMessage && comments.length > 0 ? (
                    <ol className="flight-details-page__comments-list" aria-label={t('flightDetails.comments.listAria')}>
                      {comments.map((comment) => {
                        const normalizedAuthor = comment.author.trim().toLowerCase()
                        const isOwnComment =
                          Boolean(currentUserFullName) &&
                          (normalizedAuthor === currentUserFullName || comment.authorId === user?.id)

                        return (
                          <li
                            key={comment.id}
                            className={`flight-details-page__comment-item ${
                              isOwnComment
                                ? 'flight-details-page__comment-item--self'
                                : 'flight-details-page__comment-item--other'
                            }`}
                          >
                            <div className="flight-details-page__comment-meta">
                              <strong>{comment.author}</strong>
                              <time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
                            </div>
                            <p>{comment.content}</p>
                          </li>
                        )
                      })}
                    </ol>
                  ) : null}

                  <form className="flight-details-page__comment-form" onSubmit={handleCommentSubmit}>
                    <label className="flight-details-page__comment-input-wrap">
                      <span>{t('flightDetails.comments.inputLabel')}</span>
                      <textarea
                        value={newCommentContent}
                        onChange={(event) => {
                          setNewCommentContent(event.target.value)
                          if (submitCommentErrorMessage) {
                            setSubmitCommentErrorMessage(null)
                          }
                        }}
                        placeholder={t('flightDetails.comments.inputPlaceholder')}
                        rows={3}
                        maxLength={500}
                        disabled={isSubmittingComment}
                      />
                    </label>

                    {submitCommentErrorMessage ? (
                      <p className="flight-details-page__status flight-details-page__status--error" role="alert">
                        {submitCommentErrorMessage}
                      </p>
                    ) : null}

                    <button
                      type="submit"
                      className="flight-details-page__comment-submit"
                      disabled={isSubmittingComment}
                    >
                      {isSubmittingComment
                        ? t('flightDetails.comments.submitting')
                        : t('flightDetails.comments.submit')}
                    </button>
                  </form>
                </article>
              </section>
            </div>
          ) : null}
          <button type="button" className="flight-details-page__back" onClick={handleBack}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>{t('flightDetails.back')}</span>
          </button>
        </article>
      </section>
    </main>
  )
}
