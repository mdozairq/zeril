import { useState, useCallback } from 'react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

export function useUsdcBalance() {
  const [balance, setBalance] = useState<bigint>(0n)
  const [loading, setLoading] = useState(false)

  const fetchBalance = useCallback(async (algorand: AlgorandClient, address: string, assetId: bigint) => {
    setLoading(true)
    try {
      const info = await algorand.account.getInformation(address)
      const holding = info.assets?.find((a) => a.assetId === assetId)
      const bal = holding?.amount ?? 0n
      setBalance(bal)
      return bal
    } catch {
      setBalance(0n)
      return 0n
    } finally {
      setLoading(false)
    }
  }, [])

  return { balance, loading, fetchBalance }
}
