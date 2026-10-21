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
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(date)
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
