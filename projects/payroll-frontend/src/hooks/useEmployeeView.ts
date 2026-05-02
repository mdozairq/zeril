import { useState, useCallback, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { EmployerClient } from '../contracts/Employer'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { loadCompany, type CompanyMeta } from '../utils/companyStore'
import { loadAllocation, type AllocationConfig, getDefaultAllocation } from '../utils/tokenAllocation'
import {
  saveEmployeeContractAppId,
  loadEmployeeContractAppId,
  clearEmployeeContractAppId,
} from '../utils/employeeContractMapping'

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

const initialState: EmployeeViewState = {
  appId: null,
  appAddress: null,
  salary: 0n,
  isActive: false,
  lastPaidRound: 0n,
  optedIntoUsdc: false,
  companyMeta: null,
  allocation: null,
  connected: false,
}

export function useEmployeeView() {
  const { transactionSigner, activeAddress } = useWallet()
  const [state, setState] = useState<EmployeeViewState>(initialState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Incremented whenever persisted employee App ID mapping is cleared (sync appIdInput in context). */
  const [mappingBump, setMappingBump] = useState(0)

  useEffect(() => {
    setState(initialState)
    setError(null)
    setMappingBump(0)
  }, [activeAddress])

  const getAlgorand = useCallback(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    algorand.setDefaultSigner(transactionSigner)
    return algorand
  }, [transactionSigner])

  const disconnectFromCompany = useCallback(() => {
    if (activeAddress) clearEmployeeContractAppId(activeAddress)
    setMappingBump((b) => b + 1)
    setState(initialState)
    setError(null)
  }, [activeAddress])

  const connectToCompany = useCallback(async (appId: bigint) => {
    if (!activeAddress) throw new Error('Wallet not connected')
    const appIdStr = appId.toString()
    const stored = loadEmployeeContractAppId(activeAddress)
    setLoading(true)
    setError(null)

    try {
      const algorand = getAlgorand()
      const client = algorand.client.getTypedAppClientById(EmployerClient, {
        appId,
        defaultSender: activeAddress,
      })

      const globalState = await client.state.global.getAll()
      const usdcAssetId = globalState.usdcAssetId ?? 0n

      try {
        const record = await client.send.getEmployee({
          args: { employee: activeAddress },
          populateAppCallResources: true,
        })

        let optedIn = false
        if (usdcAssetId > 0n) {
          try {
            const info = await algorand.account.getInformation(activeAddress)
            optedIn = info.assets?.some((a) => a.assetId === usdcAssetId) ?? false
          } catch {
            optedIn = false
          }
        }

        const companyMeta = loadCompany(appIdStr)
        const allocation = loadAllocation(activeAddress) ?? getDefaultAllocation(appIdStr)

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
        saveEmployeeContractAppId(activeAddress, appIdStr)
      } catch {
        setError('Your wallet address is not registered as an employee in this contract.')
        setState(prev => ({ ...prev, appId, appAddress: client.appAddress.toString(), connected: false }))
        if (stored === appIdStr) {
          clearEmployeeContractAppId(activeAddress)
          setMappingBump((b) => b + 1)
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to contract')
      if (stored === appIdStr) {
        clearEmployeeContractAppId(activeAddress)
        setMappingBump((b) => b + 1)
      }
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
    mappingBump,
    connectToCompany,
    disconnectFromCompany,
    setOnChainAllocation,
    getAlgorand,
  }
}
