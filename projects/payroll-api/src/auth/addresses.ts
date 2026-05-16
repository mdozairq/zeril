import algosdk from 'algosdk'

/** Canonical Algorand address string for comparisons and challenge keys. */
export function normalizeAddress(addr: string): string {
  return algosdk.encodeAddress(algosdk.decodeAddress(addr).publicKey)
}

export function sameAddress(a: string, b: string): boolean {
  try {
    return normalizeAddress(a) === normalizeAddress(b)
  } catch {
    return a === b
  }
}
