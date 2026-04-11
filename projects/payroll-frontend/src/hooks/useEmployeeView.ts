import { useState, useCallback } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { EmployerClient } from '../contracts/Employer'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { loadCompany, type CompanyMeta } from '../utils/companyStore'
import { loadAllocation, type AllocationConfig, getDefaultAllocation } from '../utils/tokenAllocation'

export interface EmployeeViewState {
  appId: bigint | null
  appAddress: string | null
  salary: bigint
  isActive: boolean
  lastPaidRound: bigint
  optedIntoUsdc: boolean
  companyMeta: CompanyMeta | null
  allocation: AllocationConfig | null
  connected: boolean
}

export function useEmployeeView() {
  const { transactionSigner, activeAddress } = useWallet()
  const [state, setState] = useState<EmployeeViewState>({
    appId: null,
    appAddress: null,
    salary: 0n,
    isActive: false,
    lastPaidRound: 0n,
    optedIntoUsdc: false,
    companyMeta: null,
    allocation: null,
    connected: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAlgorand = useCallback(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    algorand.setDefaultSigner(transactionSigner)
    return algorand
  }, [transactionSigner])

  const connectToCompany = useCallback(async (appId: bigint) => {
    if (!activeAddress) throw new Error('Wallet not connected')
    setLoading(true)
    setError(null)

    try {
      const algorand = getAlgorand()
      const client = algorand.client.getTypedAppClientById(EmployerClient, {
        appId,
        defaultSender: activeAddress,
      })

      // Read global state to get USDC asset ID
      const globalState = await client.state.global.getAll()
      const usdcAssetId = globalState.usdcAssetId ?? 0n

      // Try to read this employee's record
      try {
        const record = await client.send.getEmployee({
          args: { employee: activeAddress },
          populateAppCallResources: true,
        })

        // Check USDC opt-in
        let optedIn = false
        if (usdcAssetId > 0n) {
          try {
            const info = await algorand.account.getInformation(activeAddress)
            optedIn = info.assets?.some((a) => a.assetId === usdcAssetId) ?? false
          } catch {
            optedIn = false
          }
        }

        const companyMeta = loadCompany(appId.toString())
        const allocation = loadAllocation(activeAddress) ?? getDefaultAllocation(appId.toString())

        setState({
          appId,
          appAddress: client.appAddress.toString(),
          salary: record.return?.salaryUsdcMicrounits ?? 0n,
          isActive: (record.return?.isActive ?? 0n) === 1n,
          lastPaidRound: record.return?.lastPaidRound ?? 0n,
          optedIntoUsdc: optedIn,
          companyMeta,
          allocation,
          connected: true,
        })
      } catch {
        setError('Your wallet address is not registered as an employee in this contract.')
        setState(prev => ({ ...prev, appId, appAddress: client.appAddress.toString(), connected: false }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to contract')
    } finally {
      setLoading(false)
    }
  }, [activeAddress, getAlgorand])

  const setOnChainAllocation = useCallback(async (usdcPct: bigint) => {
    if (!activeAddress || !state.appId) throw new Error('Not connected')
    setLoading(true)
    try {
      const algorand = getAlgorand()
      const client = algorand.client.getTypedAppClientById(EmployerClient, {
        appId: state.appId,
        defaultSender: activeAddress,
      })
      await client.send.setAllocation({
        args: { employee: activeAddress, usdcPct },
        populateAppCallResources: true,
      })
    } finally {
      setLoading(false)
    }
  }, [activeAddress, state.appId, getAlgorand])

  return {
    ...state,
    loading,
    error,
    connectToCompany,
    setOnChainAllocation,
    getAlgorand,
  }
}
