import { createHash, randomBytes } from 'node:crypto'

export function sha256Hex(input: string) {
  return createHash('sha256').update(input).digest('hex')
}

export function randomInviteCode() {
  // 16 bytes => 32 hex chars, good enough for sandbox
  return randomBytes(16).toString('hex')
}

