import type { UserDto } from './authService'
import { createStore } from 'zustand/vanilla'

type AuthSession = {
  user: UserDto
  accessToken: string
  refreshToken: string
}

type AuthSessionState = {
  session: AuthSession | null
}

const authSessionStore = createStore<AuthSessionState>(() => ({
  session: null,
}))

function getCurrentSession(): AuthSession | null {
  return authSessionStore.getState().session
}

export function setAuthSession(session: AuthSession): void {
  authSessionStore.setState({ session })
}

export function clearAuthSession(): void {
  authSessionStore.setState({ session: null })
}

export function getAccessToken(): string | null {
  return getCurrentSession()?.accessToken ?? null
}


export function getCurrentUser(): UserDto | null {
  return getCurrentSession()?.user ?? null
}