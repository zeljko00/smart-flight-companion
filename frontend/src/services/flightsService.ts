import { apiRequest } from './apiClient'

type ApiAirport = {
  iata?: string
  name?: string
  address?: string
  latitude?: number
  longitude?: number
  city?: string
}

type ApiFlight = {
  id: string
  fligtNumber?: string
  flightNumber?: string
  airline?: string
  status?: string
  terminal?: number
  gate?: string
  aircraft?: string
  seatCapacity?: number
  seatsFree?: number
  departureTime?: string
  scheduledArrivalTime?: string
  scheduledDepartureTime?: string
  arrivalTime?: string
  economyPrice?: number | null
  premiumEconomyPrice?: number | null
  businessPrice?: number | null
  firstClassPrice?: number | null
  departureAirport?: ApiAirport
  arrivalAirport?: ApiAirport
}

export type UpcomingFlight = {
  id: string
  flightNumber: string
  airline: string
  fromLabel: string
  toLabel: string
  departureLabel: string
  statusLabel: string
  departureAt: Date
}

export type FlightTableRow = {
  id: string
  flightNumber: string
  airline: string
  fromLabel: string
  toLabel: string
  departureLabel: string
  statusLabel: string
  lowestPriceLabel: string
  departureAt: Date | null
}

export type FlightDetails = {
  id: string
  flightNumber: string
  airline: string
  statusLabel: string
  terminal: number | null
  gate: string
  aircraft: string
  seatCapacity: number | null
  seatsFree: number | null
  departureAirport: {
    iata: string
    name: string
    address: string
    latitude: number | null
    longitude: number | null
  }
  arrivalAirport: {
    iata: string
    name: string
    address: string
    latitude: number | null
    longitude: number | null
  }
  scheduledDepartureLabel: string
  scheduledArrivalLabel: string
  departureLabel: string
  arrivalLabel: string
  economyPriceValue: number | null
  premiumEconomyPriceValue: number | null
  businessPriceValue: number | null
  firstClassPriceValue: number | null
  economyPriceLabel: string
  premiumEconomyPriceLabel: string
  businessPriceLabel: string
  firstClassPriceLabel: string
  durationLabel: string
}

export type FlightSearchFilters = {
  airline?: string
  start?: string
  destination?: string
  departureTime?: Date
  status?: string
  maxPrice?: number
}

function parseDate(value?: string): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function airportLabel(airport?: ApiAirport): string {
  if (!airport) {
    return 'TBD'
  }

  return airport.iata || airport.name || airport.city || 'TBD'
}

function toAirportDetails(airport?: ApiAirport): FlightDetails['departureAirport'] {
  return {
    iata: airport?.iata || 'TBD',
    name: airport?.name || 'TBD',
    address: airport?.address || 'TBD',
    latitude: typeof airport?.latitude === 'number' && Number.isFinite(airport.latitude)
      ? airport.latitude
      : null,
    longitude: typeof airport?.longitude === 'number' && Number.isFinite(airport.longitude)
      ? airport.longitude
      : null,
  }
}

function formatDeparture(date: Date): string {
  return new Intl.DateTimeFormat('sr-RS', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value)
}

function getLowestPriceLabel(flight: ApiFlight): string {
  const prices = [
    flight.economyPrice,
    flight.premiumEconomyPrice,
    flight.businessPrice,
    flight.firstClassPrice,
  ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0)

  if (prices.length === 0) {
    return 'N/A'
  }

  return formatPrice(Math.min(...prices))
}

function priceLabel(value?: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 'N/A'
  }

  return formatPrice(value)
}

function formatDuration(departureAt: Date, arrivalAt: Date): string {
  const diffMs = arrivalAt.getTime() - departureAt.getTime()
  if (diffMs <= 0) {
    return 'TBD'
  }

  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes}min`
  }

  return `${hours}h ${minutes}min`
}

export async function fetchUpcomingFlights(limit = 12): Promise<UpcomingFlight[]> {
  const nowIso = new Date().toISOString()
  const flights = await apiRequest<ApiFlight[]>(
    `/flights/search?arrivalTime=${encodeURIComponent(nowIso)}`,
  )
  const now = Date.now()

  return flights
    .map((flight) => {
      const departureAt = parseDate(flight.departureTime) ?? parseDate(flight.scheduledDepartureTime)
      if (!departureAt) {
        return null
      }

      return {
        id: flight.id,
        flightNumber: flight.flightNumber || flight.fligtNumber || 'Unknown #',
        airline: flight.airline || 'Unknown airline',
        fromLabel: airportLabel(flight.departureAirport),
        toLabel: airportLabel(flight.arrivalAirport),
        departureLabel: formatDeparture(departureAt),
        statusLabel: flight.status || 'Scheduled',
        departureAt,
      }
    })
    .filter((flight): flight is UpcomingFlight => Boolean(flight))
    .filter((flight) => flight.departureAt.getTime() >= now)
    .sort((a, b) => a.departureAt.getTime() - b.departureAt.getTime())
    .slice(0, limit)
}

export async function fetchAllFlights(filters: FlightSearchFilters = {}): Promise<FlightTableRow[]> {
  const queryParams = new URLSearchParams()

  if (filters.airline?.trim()) {
    queryParams.set('airline', filters.airline.trim())
  }

  if (filters.start?.trim()) {
    queryParams.set('start', filters.start.trim())
  }

  if (filters.destination?.trim()) {
    queryParams.set('destination', filters.destination.trim())
  }

  if (filters.status?.trim()) {
    queryParams.set('status', filters.status.trim())
  }

  if (typeof filters.maxPrice === 'number' && Number.isFinite(filters.maxPrice) && filters.maxPrice >= 0) {
    queryParams.set('maxPrice', filters.maxPrice.toString())
  }

  if (filters.departureTime) {
    queryParams.set('departure', filters.departureTime.toISOString())
  }

  const searchPath = queryParams.size > 0
    ? `/flights/search?${queryParams.toString()}`
    : '/flights/search'

  const flights = await apiRequest<ApiFlight[]>(searchPath)

  return flights
    .map((flight) => {
      const departureAt = parseDate(flight.departureTime) ?? parseDate(flight.scheduledDepartureTime)

      return {
        id: flight.id,
        flightNumber: flight.flightNumber || flight.fligtNumber || 'Unknown #',
        airline: flight.airline || 'Unknown airline',
        fromLabel: airportLabel(flight.departureAirport),
        toLabel: airportLabel(flight.arrivalAirport),
        departureLabel: departureAt ? formatDeparture(departureAt) : 'TBD',
        statusLabel: flight.status || 'Scheduled',
        lowestPriceLabel: getLowestPriceLabel(flight),
        departureAt,
      }
    })
    .sort((a, b) => {
      if (!a.departureAt && !b.departureAt) {
        return a.flightNumber.localeCompare(b.flightNumber)
      }

      if (!a.departureAt) {
        return 1
      }

      if (!b.departureAt) {
        return -1
      }

      return a.departureAt.getTime() - b.departureAt.getTime()
    })
}

export async function fetchFlightById(id: string): Promise<FlightDetails> {
  const flight = await apiRequest<ApiFlight>(`/flights/${encodeURIComponent(id)}`)
  const scheduledDepartureAt = parseDate(flight.scheduledDepartureTime)
  const scheduledArrivalAt = parseDate(flight.scheduledArrivalTime)
  const departureAt = parseDate(flight.departureTime)
  const arrivalAt = parseDate(flight.arrivalTime)

  return {
    id: flight.id,
    flightNumber: flight.flightNumber || flight.fligtNumber || 'Unknown #',
    airline: flight.airline || 'Unknown airline',
    statusLabel: flight.status || 'Scheduled',
    terminal:
      typeof flight.terminal === 'number' && Number.isFinite(flight.terminal)
        ? flight.terminal
        : null,
    gate: flight.gate || 'TBD',
    aircraft: flight.aircraft || 'TBD',
    seatCapacity:
      typeof flight.seatCapacity === 'number' && Number.isFinite(flight.seatCapacity)
        ? flight.seatCapacity
        : null,
    seatsFree:
      typeof flight.seatsFree === 'number' && Number.isFinite(flight.seatsFree)
        ? flight.seatsFree
        : null,
    departureAirport: toAirportDetails(flight.departureAirport),
    arrivalAirport: toAirportDetails(flight.arrivalAirport),
    scheduledDepartureLabel: scheduledDepartureAt ? formatDeparture(scheduledDepartureAt) : 'TBD',
    scheduledArrivalLabel: scheduledArrivalAt ? formatDeparture(scheduledArrivalAt) : 'TBD',
    departureLabel: departureAt ? formatDeparture(departureAt) : 'TBD',
    arrivalLabel: arrivalAt ? formatDeparture(arrivalAt) : 'TBD',
    economyPriceValue:
      typeof flight.economyPrice === 'number' && Number.isFinite(flight.economyPrice) && flight.economyPrice >= 0
        ? flight.economyPrice
        : null,
    premiumEconomyPriceValue:
      typeof flight.premiumEconomyPrice === 'number' && Number.isFinite(flight.premiumEconomyPrice) && flight.premiumEconomyPrice >= 0
        ? flight.premiumEconomyPrice
        : null,
    businessPriceValue:
      typeof flight.businessPrice === 'number' && Number.isFinite(flight.businessPrice) && flight.businessPrice >= 0
        ? flight.businessPrice
        : null,
    firstClassPriceValue:
      typeof flight.firstClassPrice === 'number' && Number.isFinite(flight.firstClassPrice) && flight.firstClassPrice >= 0
        ? flight.firstClassPrice
        : null,
    durationLabel: departureAt && arrivalAt
      ? formatDuration(departureAt, arrivalAt)
      : 'TBD',
    economyPriceLabel: priceLabel(flight.economyPrice),
    premiumEconomyPriceLabel: priceLabel(flight.premiumEconomyPrice),
    businessPriceLabel: priceLabel(flight.businessPrice),
    firstClassPriceLabel: priceLabel(flight.firstClassPrice),
  }
}
