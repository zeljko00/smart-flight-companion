import { apiRequest } from './apiClient'

export type SeatType = 'economy' | 'premiumEconomy' | 'business' | 'firstClass'

type ApiBoardingPass = {
  id: string
  seat?: number | string
  price?: number
  flightId?: string
  userId?: string
  issuedAt?: string
}

export type BoardingPassPurchaseResult = {
  id: string
  seat: SeatType
  price: number | null
  flightId: string
  userId: string
  issuedAt: string
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
