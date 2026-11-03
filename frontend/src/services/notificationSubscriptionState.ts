const pendingFlightSubscriptions = new Set<string>()

function normalizeFlightIds(flightIds: string[]): string[] {
  const normalized = new Set<string>()

  for (const flightId of flightIds) {
    const trimmedFlightId = flightId.trim()
    if (trimmedFlightId.length > 0) {
      normalized.add(trimmedFlightId)
    }
  }

  return Array.from(normalized)
}

export function readPendingFlightSubscriptions(): string[] {
  return Array.from(pendingFlightSubscriptions)
}

export function addPendingFlightSubscription(flightId: string): void {
  const trimmedFlightId = flightId.trim()
  if (trimmedFlightId.length === 0) {
    return
  }

  pendingFlightSubscriptions.add(trimmedFlightId)
}

export function clearPendingFlightSubscriptions(flightIds: string[]): void {
  const normalizedToClear = new Set(normalizeFlightIds(flightIds))
  if (normalizedToClear.size === 0) {
    return
  }

  for (const flightId of normalizedToClear) {
    pendingFlightSubscriptions.delete(flightId)
  }
}