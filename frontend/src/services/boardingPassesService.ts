import { apiRequest, apiRequestBlob } from './apiClient'

export type SeatType = 'economy' | 'premiumEconomy' | 'business' | 'firstClass'

type ApiBoardingPass = {
  id: string
  seat?: number | string
  price?: number
  flightId?: string
  flightNumber?: string
  flightAirline?: string
  flightDepartureAirport?: string
  flightArrivalAirport?: string
  flightDepartureTime?: string
  flightArrivalTime?: string
  userId?: string
  issuedAt?: string
  isValid?: boolean
}

export type BoardingPassPurchaseResult = {
  id: string
  seat: SeatType
  price: number | null
  flightId: string
  userId: string
  issuedAt: string
}

export type UserBoardingPass = {
  id: string
  flightNumber: string
  airline: string
  routeStart: string
  routeDest: string
  departureAt: string
  arrivalAt: string
  seat: SeatType
  price: number | null
  issuedAt: string
  isValid: boolean
}

const seatToApiValue: Record<SeatType, number> = {
  economy: 0,
  premiumEconomy: 1,
  business: 2,
  firstClass: 3,
}

function normalizeSeat(rawSeat: number | string | undefined): SeatType {
  if (typeof rawSeat === 'string') {
    const normalized = rawSeat.trim().toLowerCase()
    if (normalized === 'economy') {
      return 'economy'
    }

    if (normalized === 'premiumeconomy' || normalized === 'premium_economy' || normalized === 'premium-economy') {
      return 'premiumEconomy'
    }

    if (normalized === 'business') {
      return 'business'
    }

    if (normalized === 'firstclass' || normalized === 'first_class' || normalized === 'first-class') {
      return 'firstClass'
    }
  }

  if (rawSeat === 1) {
    return 'premiumEconomy'
  }

  if (rawSeat === 2) {
    return 'business'
  }

  if (rawSeat === 3) {
    return 'firstClass'
  }

  return 'economy'
}

export async function createBoardingPass(
  flightId: string,
  seat: SeatType,
): Promise<BoardingPassPurchaseResult> {
  const boardingPass = await apiRequest<ApiBoardingPass>(
    `/flights/${encodeURIComponent(flightId)}/boarding-passes`,
    {
      method: 'POST',
      body: {
        seat: seatToApiValue[seat],
      },
    },
  )

  return {
    id: boardingPass.id,
    seat: normalizeSeat(boardingPass.seat),
    price: typeof boardingPass.price === 'number' && Number.isFinite(boardingPass.price)
      ? boardingPass.price
      : null,
    flightId: boardingPass.flightId ?? flightId,
    userId: boardingPass.userId ?? '',
    issuedAt: boardingPass.issuedAt ?? new Date().toISOString(),
  }
}

function toUserBoardingPass(boardingPass: ApiBoardingPass): UserBoardingPass {
  const departureIata = boardingPass.flightDepartureAirport?.trim() || 'TBD'
  const arrivalIata = boardingPass.flightArrivalAirport?.trim() || 'TBD'

  return {
    id: boardingPass.id,
    flightNumber: boardingPass.flightNumber?.trim() || 'Unknown #',
    airline: boardingPass.flightAirline?.trim() || 'Unknown airline',
    routeStart: `${departureIata}`,
    routeDest:  `${arrivalIata}`,
    departureAt: boardingPass.flightDepartureTime ?? '',
    arrivalAt: boardingPass.flightArrivalTime ?? '',
    seat: normalizeSeat(boardingPass.seat),
    price: typeof boardingPass.price === 'number' && Number.isFinite(boardingPass.price)
      ? boardingPass.price
      : null,
    issuedAt: boardingPass.issuedAt ?? '',
    isValid: boardingPass.isValid !== false,
  }
}

export async function fetchBoardingPassesByUserId(userId: string): Promise<UserBoardingPass[]> {
  const boardingPasses = await apiRequest<ApiBoardingPass[]>(`/users/${encodeURIComponent(userId)}/boarding-passes`)

  return boardingPasses
    .map(toUserBoardingPass)
    .sort((first, second) => {
      const left = new Date(second.issuedAt).getTime()
      const right = new Date(first.issuedAt).getTime()

      if (Number.isNaN(left) && Number.isNaN(right)) {
        return 0
      }

      if (Number.isNaN(left)) {
        return 1
      }

      if (Number.isNaN(right)) {
        return -1
      }

      return left - right
    })
}

export async function downloadBoardingPassPdf(boardingPassId: string): Promise<Blob> {
  return await apiRequestBlob(`/users/me/boarding-passes/${encodeURIComponent(boardingPassId)}/pdf`)
}
