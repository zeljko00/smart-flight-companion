import { apiRequest } from './apiClient'

type ApiAirport = {
  iata?: string
  name?: string
  city?: string
}

type ApiFlight = {
  id: string
  fligtNumber?: string
  flightNumber?: string
  airline?: string
  status?: string
  departureTime?: string
  scheduledDepartureTime?: string
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
