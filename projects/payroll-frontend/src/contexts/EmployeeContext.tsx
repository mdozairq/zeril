import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useEmployeeView, type EmployeeViewState } from '../hooks/useEmployeeView'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { getAlgoUsdcPrice } from '../utils/tinyman'
import { loadAllocation, type AllocationConfig } from '../utils/tokenAllocation'
import { type CompanyMeta } from '../utils/companyStore'

interface PaymentRecord {
  id: string
  round: number
  timestamp: string
  amount: bigint
  type: 'usdc' | 'algo'
}

interface EmployeeContextType extends EmployeeViewState {
  loading: boolean
  error: string | null
  appIdInput: string
  setAppIdInput: (v: string) => void
  handleConnect: () => Promise<void>
  setOnChainAllocation: (usdcPct: bigint) => Promise<void>

  network: string
  explorerBase: string
  algoPrice: number
  loadingPrice: boolean
  fetchPrice: () => Promise<void>

  allocation: AllocationConfig | null
  algoPercentage: number

  paymentHistory: PaymentRecord[]
  loadingHistory: boolean
}

const EmployeeContext = createContext<EmployeeContextType | null>(null)

export function useEmployee() {
  const ctx = useContext(EmployeeContext)
  if (!ctx) throw new Error('useEmployee must be used within EmployeeProvider')
  return ctx
}

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const { activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const employeeView = useEmployeeView()
  const [appIdInput, setAppIdInput] = useState('')
  const [algoPrice, setAlgoPrice] = useState(0)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const network = getAlgodConfigFromViteEnvironment().network
  const explorerBase = network === 'mainnet'
    ? 'https://explorer.perawallet.app'
    : 'https://testnet.explorer.perawallet.app'

  const handleConnect = async () => {
    if (!appIdInput) return
    try {
      await employeeView.connectToCompany(BigInt(appIdInput))
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to connect', { variant: 'error' })
    }
  }

  const fetchPrice = async () => {
    setLoadingPrice(true)
    try {
      const price = await getAlgoUsdcPrice(network)
      setAlgoPrice(price)
    } catch {
      enqueueSnackbar('Failed to fetch ALGO price', { variant: 'error' })
    } finally {
      setLoadingPrice(false)
    }
  }

  useEffect(() => {
    if (!employeeView.connected || !activeAddress || !employeeView.appAddress) return

    const fetchHistory = async () => {
      setLoadingHistory(true)
      try {
        const indexerConfig = getIndexerConfigFromViteEnvironment()
        const baseUrl = `${indexerConfig.server}${indexerConfig.port ? ':' + indexerConfig.port : ''}`
        const res = await fetch(
          `${baseUrl}/v2/accounts/${activeAddress}/transactions?address-role=receiver&limit=20`
        )
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        const records: PaymentRecord[] = []
        for (const txn of data.transactions || []) {
          if (txn.sender !== employeeView.appAddress) continue

          if (txn['tx-type'] === 'pay' && txn['payment-transaction']) {
            records.push({
              id: txn.id,
              round: txn['confirmed-round'],
              timestamp: new Date(txn['round-time'] * 1000).toISOString(),
              amount: BigInt(txn['payment-transaction'].amount),
              type: 'algo',
            })
          } else if (txn['tx-type'] === 'axfer' && txn['asset-transfer-transaction']) {
            records.push({
              id: txn.id,
              round: txn['confirmed-round'],
              timestamp: new Date(txn['round-time'] * 1000).toISOString(),
              amount: BigInt(txn['asset-transfer-transaction'].amount),
              type: 'usdc',
            })
          }
        }

        setPaymentHistory(records.sort((a, b) => b.round - a.round))
      } catch {
        setPaymentHistory([])
      } finally {
        setLoadingHistory(false)
      }
    }

    fetchHistory()
  }, [employeeView.connected, activeAddress, employeeView.appAddress])

  const allocation = activeAddress ? loadAllocation(activeAddress) : null
  const algoAlloc = allocation?.allocations.find(a => a.token === 'ALGO')
  const algoPercentage = algoAlloc?.percentage ?? 0

  const value: EmployeeContextType = {
    ...employeeView,
    appIdInput,
    setAppIdInput,
    handleConnect,
    network,
    explorerBase,
    algoPrice,
    loadingPrice,
    fetchPrice,
    allocation,
    algoPercentage,
    paymentHistory,
    loadingHistory,
  }

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  )
}
