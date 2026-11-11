import type { UserDto } from './authService'

type AuthSession = {
  user: UserDto
  accessToken: string
  refreshToken: string
}

let currentSession: AuthSession | null = null

export function setAuthSession(session: AuthSession): void {
  currentSession = session
}

export function clearAuthSession(): void {
  currentSession = null
}

export function getAccessToken(): string | null {
  return currentSession?.accessToken ?? null
}

export function getRefreshToken(): string | null {
  return currentSession?.refreshToken ?? null
}

export function getCurrentUser(): UserDto | null {
  return currentSession?.user ?? null
}

export function updateTokens(accessToken: string, refreshToken: string): void {
  if (!currentSession) {
    return
  }

  currentSession = {
    ...currentSession,
    accessToken,
    refreshToken,
  }
}