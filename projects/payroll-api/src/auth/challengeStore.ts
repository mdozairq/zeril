import { randomBytes } from 'node:crypto'
import { normalizeAddress } from './addresses.js'

type Challenge = {
  address: string
  nonce: string
  expiresAtMs: number
}

const store = new Map<string, Challenge>()

export function createChallenge(address: string) {
  const normalized = normalizeAddress(address)
  const nonce = randomBytes(16).toString('hex')
  const expiresAtMs = Date.now() + 5 * 60 * 1000
  const key = `${normalized}:${nonce}`
  const c: Challenge = { address: normalized, nonce, expiresAtMs }
  store.set(key, c)
  return c
}

export function consumeChallenge(address: string, nonce: string) {
  const normalized = normalizeAddress(address)
  const key = `${normalized}:${nonce}`
  const c = store.get(key)
  if (!c) return null
  store.delete(key)
  if (c.expiresAtMs < Date.now()) return null
  return c
}
