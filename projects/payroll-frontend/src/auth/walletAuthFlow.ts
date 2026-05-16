import algosdk from 'algosdk'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { perRoleTokenKey, type WalletAuthRole } from './walletAuth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export type TransactionSigner = (
  txns: algosdk.Transaction[],
  indexes: number[],
) => Promise<Uint8Array[]>

let getSigner: (() => TransactionSigner | null) | null = null

export function registerTransactionSigner(getter: () => TransactionSigner | null) {
  getSigner = getter
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

export async function performWalletAuth(
  activeAddress: string,
  role: WalletAuthRole,
  sign: TransactionSigner,
): Promise<string | null> {
  const challengeRes = await fetch(
    `${API_BASE}/api/auth/challenge?address=${encodeURIComponent(activeAddress)}&role=${role}`,
  )
  if (!challengeRes.ok) return null
  const challenge = (await challengeRes.json()) as { nonce: string; address?: string }
  const authAddress = challenge.address ?? activeAddress

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const indexerConfig = getIndexerConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })

  const sp = await algorand.client.algod.getTransactionParams().do()
  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: authAddress,
    receiver: authAddress,
    amount: 0,
    note: new TextEncoder().encode(`zeril-auth:${challenge.nonce}`),
    suggestedParams: { ...sp, flatFee: true, fee: 1000 },
  })

  const signed = await sign([txn], [0])
  const signedTxnB64 = toBase64(signed[0])

  const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: authAddress,
      role,
      nonce: challenge.nonce,
      signedTxnB64,
    }),
  })
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}))
    console.warn('[auth] verify failed:', err)
    return null
  }
  const verified = (await verifyRes.json()) as { token: string }
  localStorage.setItem('zeril_api_token', verified.token)
  localStorage.setItem(perRoleTokenKey(activeAddress, role), verified.token)
  return verified.token
}

export async function runPerformWalletAuth(
  activeAddress: string,
  role: WalletAuthRole,
): Promise<string | null> {
  const sign = getSigner?.()
  if (!sign) {
    console.warn('[auth] wallet signer not ready')
    return null
  }
  return performWalletAuth(activeAddress, role, sign)
}
