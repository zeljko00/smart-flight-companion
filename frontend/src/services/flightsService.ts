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
  aiExchanges: FlightAiExchange[]
}

export type FlightAiExchange = {
  id: string
  request: string
  response: string
  userId: string | null
  flightId: string | null
  timestamp: string
}

export type FlightSearchFilters = {
  airline?: string
  start?: string
  destination?: string
  departureTime?: Date
  status?: string
  maxPrice?: number
}

export type FlightPaginationParams = {
  page?: number
  pageSize?: number
}

export const FLIGHT_STATUS_OPTIONS = ['Scheduled', 'Delayed', 'Departed', 'Arrived', 'Cancelled'] as const

// Payload accepted by POST /flights and PUT /flights/{id}. Times are ISO-8601 strings.
export type FlightRequest = {
  flightNumber: string
  departureAirportIata: string
  arrivalAirportIata: string
  status: string
  terminal: number
  gate: string
  airline: string
  aircraft: string
  seatCapacity: number
  scheduledDepartureTime: string
  scheduledArrivalTime: string
  departureTime?: string
  arrivalTime?: string
  economyPrice: number | null
  premiumEconomyPrice: number | null
  businessPrice: number | null
  firstClassPrice: number | null
}

// Raw flight values (not display labels) used to prefill the edit form.
export type FlightEditData = FlightRequest & {
  id: string
  departureTime: string
  arrivalTime: string
}

type ApiPagedResponse<TItem> = {
  items: TItem[]
  page: number
  pageSize: number
  totalCount: number
  hasNextPage: boolean
}

type ApiNaturalLanguageSearchFilters = {
  flightNumber?: string | null
  departure?: string | null
  destination?: string | null
  airline?: string | null
  maxPrice?: number | null
  departureTimeStart?: string | null
  departureTimeEnd?: string | null
  isLlmApplied?: boolean
  mappingNote?: string | null
}

type ApiNaturalLanguageSearchResponse = {
  query: string
  filters: ApiNaturalLanguageSearchFilters
  flights: ApiPagedResponse<ApiFlight>
}

type ApiAIExchange = {
  id?: string
  request?: string
  response?: string
  userId?: string | null
  flightId?: string | null
  timestamp?: string
}

type ApiFlightDetailsResponse = {
  flight?: ApiFlight
  aiExchanges?: ApiAIExchange[]
}

export type FlightTablePage = {
  items: FlightTableRow[]
  page: number
  pageSize: number
  totalCount: number
  hasNextPage: boolean
}

export type NaturalLanguageFlightSearchResult = {
  query: string
  isLlmApplied: boolean
  mappingNote: string | null
  page: FlightTablePage
}

function parseDate(value?: string): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const EXCLUDED_AI_FIELDS = new Set([
  'flight_id',
  'airline',
  'flight_number',
  'route',
  'terminal_gate',
  'scheduled_departure',
  'status',
])

function unwrapCodeFence(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```') || !trimmed.endsWith('```')) {
    return trimmed
  }

  const firstNewLine = trimmed.indexOf('\n')
  if (firstNewLine < 0) {
    return trimmed
  }

  const withoutHeader = trimmed.slice(firstNewLine + 1)
  const fenceIndex = withoutHeader.lastIndexOf('```')
  if (fenceIndex < 0) {
    return trimmed
  }

  return withoutHeader.slice(0, fenceIndex).trim()
}

function isEmptyAiValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim().length === 0
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length === 0
  }

  return false
}

function toDisplayLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function flattenAiFields(value: unknown, path: string[] = []): Array<{ key: string; value: string }> {
  if (value === null || value === undefined) {
    return []
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const rendered = String(value).trim()
    if (!rendered) {
      return []
    }

    const key = path.length > 0 ? path.join(' / ') : 'Response'
    return [{ key, value: rendered }]
  }

  if (Array.isArray(value)) {
    const rows: Array<{ key: string; value: string }> = []
    value.forEach((item, index) => {
      rows.push(...flattenAiFields(item, [...path, `${index + 1}`]))
    })
    return rows
  }

  if (typeof value === 'object') {
    const rows: Array<{ key: string; value: string }> = []
    const objectValue = value as Record<string, unknown>

    for (const [rawKey, nestedValue] of Object.entries(objectValue)) {
      if (EXCLUDED_AI_FIELDS.has(rawKey.toLowerCase())) {
        continue
      }

      if (isEmptyAiValue(nestedValue)) {
        continue
      }

      rows.push(...flattenAiFields(nestedValue, [...path, toDisplayLabel(rawKey)]))
    }

    return rows
  }

  return []
}

function formatAiChatResponse(raw: string): string {
  const normalized = unwrapCodeFence(raw)
  if (!normalized) {
    return ''
  }

  try {
    const parsed = JSON.parse(normalized) as unknown
    const rows = flattenAiFields(parsed)
    if (rows.length === 0) {
      return ''
    }

    return rows.map((row) => `${row.key}: ${row.value}`).join('\n')
  } catch {
    return normalized
  }
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

function priceValue(value?: number | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function toEditData(flight: ApiFlight): FlightEditData {
  return {
    id: flight.id,
    flightNumber: flight.flightNumber || flight.fligtNumber || '',
    departureAirportIata: flight.departureAirport?.iata ?? '',
    arrivalAirportIata: flight.arrivalAirport?.iata ?? '',
    status: flight.status || 'Scheduled',
    terminal: typeof flight.terminal === 'number' ? flight.terminal : 0,
    gate: flight.gate ?? '',
    airline: flight.airline ?? '',
    aircraft: flight.aircraft ?? '',
    seatCapacity: typeof flight.seatCapacity === 'number' ? flight.seatCapacity : 0,
    scheduledDepartureTime: flight.scheduledDepartureTime ?? '',
    scheduledArrivalTime: flight.scheduledArrivalTime ?? '',
    departureTime: flight.departureTime ?? '',
    arrivalTime: flight.arrivalTime ?? '',
    economyPrice: priceValue(flight.economyPrice),
    premiumEconomyPrice: priceValue(flight.premiumEconomyPrice),
    businessPrice: priceValue(flight.businessPrice),
    firstClassPrice: priceValue(flight.firstClassPrice),
  }
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

function toFlightTableRows(flights: ApiFlight[]): FlightTableRow[] {
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

export async function fetchUpcomingFlights(limit = 12, apiKey?: string): Promise<UpcomingFlight[]> {
  const normalizedApiKey = apiKey?.trim()

  const response = await apiRequest<ApiPagedResponse<ApiFlight> | ApiFlight[]>('/flights/search', {
    headers: normalizedApiKey
      ? {
          'X-API-Key': normalizedApiKey,
        }
      : undefined,
  })
  const flights = Array.isArray(response) ? response : response.items
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

export async function fetchAllFlights(
  filters: FlightSearchFilters = {},
  pagination: FlightPaginationParams = {},
): Promise<FlightTablePage> {
  const queryParams = new URLSearchParams()
  const page =
    typeof pagination.page === 'number' && Number.isFinite(pagination.page) && pagination.page >= 1
      ? Math.floor(pagination.page)
      : 1
  const pageSize =
    typeof pagination.pageSize === 'number' && Number.isFinite(pagination.pageSize) && pagination.pageSize >= 1
      ? Math.floor(pagination.pageSize)
      : 20

  queryParams.set('page', page.toString())
  queryParams.set('pageSize', pageSize.toString())

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

  const response = await apiRequest<ApiPagedResponse<ApiFlight>>(searchPath)
  const items = toFlightTableRows(response.items)

  return {
    items,
    page: response.page,
    pageSize: response.pageSize,
    totalCount: response.totalCount,
    hasNextPage: response.hasNextPage,
  }
}

export async function fetchFlightsByNaturalLanguage(
  query: string,
  pagination: FlightPaginationParams = {},
): Promise<NaturalLanguageFlightSearchResult> {
  const page =
    typeof pagination.page === 'number' && Number.isFinite(pagination.page) && pagination.page >= 1
      ? Math.floor(pagination.page)
      : 1
  const pageSize =
    typeof pagination.pageSize === 'number' && Number.isFinite(pagination.pageSize) && pagination.pageSize >= 1
      ? Math.floor(pagination.pageSize)
      : 20

  const response = await apiRequest<ApiNaturalLanguageSearchResponse>('/flights/search/natural-language', {
    method: 'POST',
    body: {
      query,
      page,
      pageSize,
    },
  })

  return {
    query: response.query,
    isLlmApplied: response.filters.isLlmApplied === true,
    mappingNote: response.filters.mappingNote ?? null,
    page: {
      items: toFlightTableRows(response.flights.items),
      page: response.flights.page,
      pageSize: response.flights.pageSize,
      totalCount: response.flights.totalCount,
      hasNextPage: response.flights.hasNextPage,
    },
  }
}

export async function fetchFlightById(id: string): Promise<FlightDetails> {
  const response = await apiRequest<ApiFlightDetailsResponse>(`/flights/${encodeURIComponent(id)}`)
  const details = response as ApiFlightDetailsResponse
  const flight = details.flight as ApiFlight
  const aiExchanges = Array.isArray(details.aiExchanges) ? details.aiExchanges : []
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
    aiExchanges: aiExchanges
      .filter((exchange) => typeof exchange.id === 'string')
      .map((exchange) => ({
        id: exchange.id || '',
        request: exchange.request || '',
        response: formatAiChatResponse(exchange.response || ''),
        userId: typeof exchange.userId === 'string' ? exchange.userId : null,
        flightId: typeof exchange.flightId === 'string' ? exchange.flightId : null,
        timestamp: exchange.timestamp || '',
      })),
  }
}

export async function fetchFlightForEdit(id: string): Promise<FlightEditData> {
  const response = await apiRequest<ApiFlightDetailsResponse>(`/flights/${encodeURIComponent(id)}`)
  const details = response as ApiFlightDetailsResponse
  const flight = details.flight as ApiFlight

  return toEditData(flight)
}

type ApiFlightAdviceResponse = {
  advice?: string
}

export async function requestFlightAdvice(flightId: string, query: string): Promise<string> {
  const response = await apiRequest<ApiFlightAdviceResponse>(
    `/flights/${encodeURIComponent(flightId)}/advice`,
    {
      method: 'POST',
      body: { query },
    },
  )

  return typeof response.advice === 'string' ? formatAiChatResponse(response.advice) : ''
}

export async function createFlight(request: FlightRequest): Promise<FlightEditData> {
  const flight = await apiRequest<ApiFlight>('/flights', {
    method: 'POST',
    body: request,
  })

  return toEditData(flight)
}

export async function updateFlight(id: string, request: FlightRequest): Promise<FlightEditData> {
  const flight = await apiRequest<ApiFlight>(`/flights/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: request,
  })

  return toEditData(flight)
}
