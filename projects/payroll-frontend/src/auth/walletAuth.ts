import algosdk from 'algosdk'
import { runPerformWalletAuth } from './walletAuthFlow'

export type WalletAuthRole = 'employer' | 'employee'

export function normalizeWalletAddress(address: string): string {
  try {
    return algosdk.encodeAddress(algosdk.decodeAddress(address).publicKey)
  } catch {
    return address
  }
}

export function roleFromPath(pathname: string): WalletAuthRole | null {
  if (pathname.startsWith('/company')) return 'employer'
  if (pathname.startsWith('/employee')) return 'employee'
  if (pathname.startsWith('/invite')) return 'employee'
  return null
}

/** Which JWT role an API route requires (overrides page role when they differ). */
export function inferAuthRoleFromApiPath(path: string, method: string): WalletAuthRole | null {
  if (/\/kyc\/submit$/.test(path)) return 'employee'
  if (/\/kyc\/(approve|reject)$/.test(path)) return 'employer'
  if (/\/companies\/[^/]+\/invitations$/.test(path) && method === 'POST') return 'employer'
  if (/\/offramp\/process$/.test(path) && method === 'POST') return 'employer'
  if (/\/leave-requests\/[^/]+\/(approve|reject)$/.test(path)) return 'employer'
  if (path.endsWith('/leave-requests') && method === 'POST') return 'employee'
  return null
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const payload = JSON.parse(atob(parts[1]))
    if (!payload.exp) return false
    return payload.exp * 1000 < Date.now() + 60_000
  } catch {
    return true
  }
}

export function getTokenRole(token: string): WalletAuthRole | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload.role === 'employer' || payload.role === 'employee' ? payload.role : null
  } catch {
    return null
  }
}

export function perRoleTokenKey(address: string, role: WalletAuthRole): string {
  return `zeril_api_token_${normalizeWalletAddress(address)}_${role}`
}

export function setActiveWalletAddress(address: string | null) {
  if (address) localStorage.setItem('zeril_wallet_address', normalizeWalletAddress(address))
  else localStorage.removeItem('zeril_wallet_address')
}

export function getActiveWalletAddress(): string | null {
  const raw = localStorage.getItem('zeril_wallet_address')
  return raw ? normalizeWalletAddress(raw) : null
}

export function getStoredToken(address: string, role: WalletAuthRole): string | null {
  const norm = normalizeWalletAddress(address)
  for (const addr of [norm, address]) {
    const cached = localStorage.getItem(perRoleTokenKey(addr, role))
    if (cached && !isTokenExpired(cached)) return cached
    if (cached) localStorage.removeItem(perRoleTokenKey(addr, role))
  }
  return null
}

export function resolveApiToken(pathname = window.location.pathname): string | null {
  const role = roleFromPath(pathname)
  const address = getActiveWalletAddress()
  if (role && address) {
    const perRole = getStoredToken(address, role)
    if (perRole) {
      localStorage.setItem('zeril_api_token', perRole)
      return perRole
    }
  }

  const active = localStorage.getItem('zeril_api_token')
  if (!active) return null
  if (isTokenExpired(active)) {
    localStorage.removeItem('zeril_api_token')
    return null
  }
  if (role) {
    const tokenRole = getTokenRole(active)
    if (tokenRole && tokenRole !== role) return null
  }
  return active
}

export function clearAuthForWallet(address: string) {
  const norm = normalizeWalletAddress(address)
  for (const addr of [norm, address]) {
    localStorage.removeItem(perRoleTokenKey(addr, 'employer'))
    localStorage.removeItem(perRoleTokenKey(addr, 'employee'))
  }
  if (getActiveWalletAddress() === norm) {
    localStorage.removeItem('zeril_api_token')
  }
}

let authWaiters: Array<(token: string | null) => void> = []

export function notifyAuthUpdated(token: string | null) {
  authWaiters.forEach((fn) => fn(token))
  authWaiters = []
}

export function waitForApiAuth(timeoutMs = 12_000, roleHint?: WalletAuthRole | null): Promise<string | null> {
  if (roleHint) {
    const address = getActiveWalletAddress()
    if (address) {
      const t = getStoredToken(address, roleHint)
      if (t) return Promise.resolve(t)
    }
  } else {
    const existing = resolveApiToken()
    if (existing) return Promise.resolve(existing)
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      authWaiters = authWaiters.filter((fn) => fn !== onUpdate)
      if (roleHint && getActiveWalletAddress()) {
        resolve(getStoredToken(getActiveWalletAddress()!, roleHint))
      } else {
        resolve(resolveApiToken())
      }
    }, timeoutMs)

    const onUpdate = (token: string | null) => {
      clearTimeout(timer)
      resolve(token ?? (roleHint && getActiveWalletAddress()
        ? getStoredToken(getActiveWalletAddress()!, roleHint)
        : resolveApiToken()))
    }

    authWaiters.push(onUpdate)

    const poll = setInterval(() => {
      const t = roleHint && getActiveWalletAddress()
        ? getStoredToken(getActiveWalletAddress()!, roleHint)
        : resolveApiToken()
      if (t) {
        clearInterval(poll)
        clearTimeout(timer)
        authWaiters = authWaiters.filter((fn) => fn !== onUpdate)
        resolve(t)
      }
    }, 250)

    setTimeout(() => clearInterval(poll), timeoutMs)
  })
}

const authFlights = new Map<string, Promise<string | null>>()

export function runWalletAuthFlight(
  key: string,
  fn: () => Promise<string | null>,
): Promise<string | null> {
  const existing = authFlights.get(key)
  if (existing) return existing

  const flight = fn().finally(() => {
    authFlights.delete(key)
  })
  authFlights.set(key, flight)
  return flight
}

/** Obtain JWT for a role — triggers wallet sign if needed. */
export async function requestWalletAuth(role: WalletAuthRole): Promise<string | null> {
  const address = getActiveWalletAddress()
  if (!address) return null

  const cached = getStoredToken(address, role)
  if (cached) {
    localStorage.setItem('zeril_api_token', cached)
    return cached
  }

  const key = `${address}:${role}`
  return runWalletAuthFlight(key, () => runPerformWalletAuth(address, role))
}

export async function resolveTokenForRequest(path: string, method: string): Promise<string | null> {
  const neededRole = inferAuthRoleFromApiPath(path, method) ?? roleFromPath(window.location.pathname)
  const address = getActiveWalletAddress()

  if (neededRole && address) {
    const stored = getStoredToken(address, neededRole)
    if (stored) {
      localStorage.setItem('zeril_api_token', stored)
      return stored
    }
    const authed = await requestWalletAuth(neededRole)
    if (authed) return authed
  }

  return resolveApiToken() ?? await waitForApiAuth(12_000, neededRole)
}
