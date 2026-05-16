import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import {
  roleFromPath,
  getStoredToken,
  setActiveWalletAddress,
  notifyAuthUpdated,
  runWalletAuthFlight,
  normalizeWalletAddress,
} from './walletAuth'
import { registerTransactionSigner, runPerformWalletAuth } from './walletAuthFlow'

export default function AuthBootstrapper() {
  const { activeAddress, transactionSigner } = useWallet()
  const { pathname } = useLocation()
  const signerRef = useRef(transactionSigner)
  signerRef.current = transactionSigner

  const role = roleFromPath(pathname)
  const normAddress = activeAddress ? normalizeWalletAddress(activeAddress) : null
  const key = normAddress && role ? `${normAddress}:${role}` : null

  useEffect(() => {
    registerTransactionSigner(() => signerRef.current ?? null)
  }, [transactionSigner])

  useEffect(() => {
    setActiveWalletAddress(activeAddress ?? null)
  }, [activeAddress])

  useEffect(() => {
    if (!key || !normAddress || !role) return

    const validToken = getStoredToken(normAddress, role)
    if (validToken) {
      localStorage.setItem('zeril_api_token', validToken)
      notifyAuthUpdated(validToken)
      return
    }

    let cancelled = false

    runWalletAuthFlight(key, async () => {
      try {
        const token = await runPerformWalletAuth(normAddress, role)
        if (!cancelled) notifyAuthUpdated(token)
        return token
      } catch (e) {
        console.warn('[auth] bootstrap error:', e)
        if (!cancelled) notifyAuthUpdated(null)
        return null
      }
    })

    return () => {
      cancelled = true
    }
  }, [key, normAddress, role])

  return null
}
