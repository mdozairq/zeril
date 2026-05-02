import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function roleFromPath(pathname: string) {
  if (pathname.startsWith('/company')) return 'employer'
  if (pathname.startsWith('/employee')) return 'employee'
  return null
}

function isTokenExpired(token: string): boolean {
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

function getValidCachedToken(address: string, role: string): string | null {
  const perRoleKey = `zeril_api_token_${address}_${role}`
  const cached = localStorage.getItem(perRoleKey)
  if (cached && !isTokenExpired(cached)) return cached
  if (cached) {
    localStorage.removeItem(perRoleKey)
    localStorage.removeItem('zeril_api_token')
  }
  return null
}

export default function AuthBootstrapper() {
  const { activeAddress, transactionSigner } = useWallet()
  const { pathname } = useLocation()
  const authDoneForKey = useRef<string | null>(null)
  const authInProgress = useRef(false)
  const signerRef = useRef(transactionSigner)
  signerRef.current = transactionSigner

  const role = roleFromPath(pathname)
  const key = activeAddress && role ? `${activeAddress}:${role}` : null

  useEffect(() => {
    if (!key || !activeAddress || !role) return

    const validToken = getValidCachedToken(activeAddress, role)
    if (validToken) {
      localStorage.setItem('zeril_api_token', validToken)
      authDoneForKey.current = key
      return
    }

    if (authDoneForKey.current === key) return
    if (authInProgress.current) return

    authDoneForKey.current = key
    authInProgress.current = true

    const run = async () => {
      try {
        const challengeRes = await fetch(
          `${API_BASE}/api/auth/challenge?address=${encodeURIComponent(activeAddress)}&role=${role}`,
        )
        if (!challengeRes.ok) return
        const challenge = (await challengeRes.json()) as { nonce: string }

        const algodConfig = getAlgodConfigFromViteEnvironment()
        const indexerConfig = getIndexerConfigFromViteEnvironment()
        const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
        algorand.setDefaultSigner(signerRef.current)

        const sp = await algorand.client.algod.getTransactionParams().do()
        const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          sender: activeAddress,
          receiver: activeAddress,
          amount: 0,
          note: new TextEncoder().encode(`zeril-auth:${challenge.nonce}`),
          suggestedParams: { ...sp, flatFee: true, fee: 1000 },
        })

        const signed = await signerRef.current([txn], [0])
        const signedTxnB64 = Buffer.from(signed[0]).toString('base64')

        const verifyRes = await fetch(`${API_BASE}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: activeAddress, role, nonce: challenge.nonce, signedTxnB64 }),
        })
        if (!verifyRes.ok) return
        const verified = (await verifyRes.json()) as { token: string }
        const perRoleKey = `zeril_api_token_${activeAddress}_${role}`
        localStorage.setItem('zeril_api_token', verified.token)
        localStorage.setItem(perRoleKey, verified.token)
      } finally {
        authInProgress.current = false
      }
    }

    run().catch(() => {
      authInProgress.current = false
    })
  }, [key, activeAddress, role])

  // Periodic expiry check (once per minute)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!activeAddress || !role) return
      const perRoleKey = `zeril_api_token_${activeAddress}_${role}`
      const cached = localStorage.getItem(perRoleKey)
      if (cached && isTokenExpired(cached)) {
        localStorage.removeItem(perRoleKey)
        localStorage.removeItem('zeril_api_token')
        authDoneForKey.current = null
      }
    }, 60_000)
    return () => clearInterval(interval)
  }, [activeAddress, role])

  return null
}
