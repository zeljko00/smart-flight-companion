import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr'

export type NotificationDto = {
  title: string
  message: string
  timestamp: string
}

type NotificationConnectionOptions = {
  onNotification: (notification: NotificationDto) => void
  onConnectionStateChange?: (isConnected: boolean) => void
}

type NotificationConnectionController = {
  start: () => Promise<void>
  updateSubscriptions: (userId: string | null, flightIds: string[]) => Promise<void>
  stop: () => Promise<void>
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

function buildSignalRHubUrl(): string {
  const configuredHubUrl = import.meta.env.VITE_SIGNALR_HUB_URL as string | undefined
  if (configuredHubUrl && configuredHubUrl.trim().length > 0) {
    return normalizeHubPath(configuredHubUrl)
  }

  const normalizedApiBase = API_BASE_URL.endsWith('/')
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL

  return `${normalizedApiBase}/notifications`
}

function normalizeHubPath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  return path.startsWith('/') ? path : `/${path}`
}

function normalizeNotification(payload: unknown): NotificationDto | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const value = payload as Record<string, unknown>

  const title = typeof value.title === 'string' && value.title.trim()
    ? value.title.trim()
    : ''
  const message = typeof value.message === 'string' && value.message.trim()
    ? value.message.trim()
    : ''
  const timestamp = typeof value.timestamp === 'string' && value.timestamp.trim()
    ? value.timestamp
    : new Date().toISOString()

  if (!title || !message) {
    return null
  }

  return {
    title,
    message,
    timestamp,
  }
}

function toNormalizedFlightIds(flightIds: string[]): string[] {
  const result = new Set<string>()

  for (const flightId of flightIds) {
    const trimmed = flightId.trim()
    if (trimmed) {
      result.add(trimmed)
    }
  }

  return Array.from(result)
}

export function createNotificationConnection(
  options: NotificationConnectionOptions,
): NotificationConnectionController {
  let subscribedUserId: string | null = null
  let subscribedFlightIds: string[] = []
  let isStopping = false
  let startInFlight: Promise<void> | null = null

  const connection: HubConnection = new HubConnectionBuilder()
    .withUrl(buildSignalRHubUrl())
    .withAutomaticReconnect()
    .build()

  connection.on('ReceiveNotification', (payload: unknown) => {
    const notification = normalizeNotification(payload)
    if (!notification) {
      return
    }

    options.onNotification(notification)
  })

  connection.onreconnecting(() => {
    options.onConnectionStateChange?.(false)
  })

  connection.onclose(() => {
    options.onConnectionStateChange?.(false)
  })

  connection.onreconnected(async () => {
    options.onConnectionStateChange?.(true)
    await joinGroups(connection, subscribedUserId, subscribedFlightIds)
  })

  async function joinGroups(conn: HubConnection, userId: string | null, flightIds: string[]): Promise<void> {
    if (conn.state !== HubConnectionState.Connected) {
      return
    }

    if (userId) {
      await conn.invoke('JoinUserGroup', userId)
    }

    for (const flightId of flightIds) {
      await conn.invoke('JoinFlightGroup', flightId)
    }
  }

  async function leaveGroups(conn: HubConnection, userId: string | null, flightIds: string[]): Promise<void> {
    if (conn.state !== HubConnectionState.Connected) {
      return
    }

    if (userId) {
      await conn.invoke('LeaveUserGroup', userId)
    }

    for (const flightId of flightIds) {
      await conn.invoke('LeaveFlightGroup', flightId)
    }
  }

  return {
    async start() {
      if (startInFlight) {
        return startInFlight
      }

      if (connection.state !== HubConnectionState.Disconnected) {
        return
      }

      startInFlight = (async () => {
        try {
          await connection.start()
          options.onConnectionStateChange?.(true)
          await joinGroups(connection, subscribedUserId, subscribedFlightIds)
        } catch (error) {
          if (
            isStopping
            || (error instanceof Error
              && error.message.toLowerCase().includes('stopped during negotiation'))
          ) {
            return
          }

          throw error
        } finally {
          startInFlight = null
        }
      })()

      await startInFlight
    },

    async updateSubscriptions(userId: string | null, flightIds: string[]) {
      const nextUserId = userId?.trim() || null
      const nextFlightIds = toNormalizedFlightIds(flightIds)

      const previousUserId = subscribedUserId
      const previousFlightIds = subscribedFlightIds

      subscribedUserId = nextUserId
      subscribedFlightIds = nextFlightIds

      if (connection.state !== HubConnectionState.Connected) {
        return
      }

      const previousFlightSet = new Set(previousFlightIds)
      const nextFlightSet = new Set(nextFlightIds)

      if (previousUserId && previousUserId !== nextUserId) {
        await connection.invoke('LeaveUserGroup', previousUserId)
      }

      for (const flightId of previousFlightSet) {
        if (!nextFlightSet.has(flightId)) {
          await connection.invoke('LeaveFlightGroup', flightId)
        }
      }

      if (nextUserId && previousUserId !== nextUserId) {
        await connection.invoke('JoinUserGroup', nextUserId)
      }

      for (const flightId of nextFlightSet) {
        if (!previousFlightSet.has(flightId)) {
          await connection.invoke('JoinFlightGroup', flightId)
        }
      }
    },

    async stop() {
      isStopping = true

      await leaveGroups(connection, subscribedUserId, subscribedFlightIds)
      subscribedUserId = null
      subscribedFlightIds = []

      if (connection.state !== HubConnectionState.Disconnected) {
        await connection.stop()
      }

      options.onConnectionStateChange?.(false)
      isStopping = false
    },
  }
}
