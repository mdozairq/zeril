import { randomBytes } from 'node:crypto'

type Challenge = {
  address: string
  nonce: string
  expiresAtMs: number
}

const store = new Map<string, Challenge>()

export function createChallenge(address: string) {
  const nonce = randomBytes(16).toString('hex')
  const expiresAtMs = Date.now() + 5 * 60 * 1000
  const key = `${address}:${nonce}`
  const c: Challenge = { address, nonce, expiresAtMs }
  store.set(key, c)
  return c
}

export function consumeChallenge(address: string, nonce: string) {
  const key = `${address}:${nonce}`
  const c = store.get(key)
  if (!c) return null
  store.delete(key)
  if (c.expiresAtMs < Date.now()) return null
  return c
}

