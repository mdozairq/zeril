import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useEmployeeView, type EmployeeViewState } from '../hooks/useEmployeeView'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { getAlgoUsdcPrice } from '../utils/tinyman'
import { loadAllocation, type AllocationConfig } from '../utils/tokenAllocation'
import { type CompanyMeta } from '../utils/companyStore'
import { loadEmployeeContractAppId, saveEmployeeContractAppId } from '../utils/employeeContractMapping'
import { employeeApi, invitationApi, companyApi } from '../services/api'
import { saveCompany } from '../utils/companyStore'

interface PaymentRecord {
  id: string
  round: number
  timestamp: string
  amount: bigint
  type: 'usdc' | 'algo'
}

interface EmployeeContextType extends EmployeeViewState {
  mappingBump: number
  loading: boolean
  error: string | null
  appIdInput: string
  setAppIdInput: (v: string) => void
  handleConnect: () => Promise<void>
  acceptInvite: (inviteCode: string, name?: string) => Promise<void>
  autoConnecting: boolean
  forgetSavedCompany: () => void
  hasSavedCompanyMapping: boolean
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
  const [autoConnecting, setAutoConnecting] = useState(false)
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

  const acceptInvite = async (inviteCode: string, name?: string) => {
    if (!activeAddress || !inviteCode.trim()) return
    try {
      const accepted = await invitationApi.accept(inviteCode.trim(), {
        walletAddress: activeAddress,
        name: name || undefined,
        actorAddress: activeAddress,
      })
      const company = await companyApi.get(accepted.companyAppId).catch(() => null)
      if (company) {
        saveCompany(accepted.companyAppId, {
          name: company.name,
          appId: company.appId,
          network: company.network,
          treasuryAsset: company.treasuryAsset,
        })
      }
      saveEmployeeContractAppId(activeAddress, accepted.companyAppId)
      setAppIdInput(accepted.companyAppId)
      await employeeView.connectToCompany(BigInt(accepted.companyAppId))
      enqueueSnackbar('Invitation accepted! You are now connected.', { variant: 'success' })
    } catch (e) {
      throw e
    }
  }

  useEffect(() => {
    if (!activeAddress) return
    setAppIdInput(loadEmployeeContractAppId(activeAddress) ?? '')
  }, [activeAddress, employeeView.mappingBump])

  useEffect(() => {
    if (!activeAddress || employeeView.connected) return
    const saved = loadEmployeeContractAppId(activeAddress)
    if (!saved) return

    let cancelled = false
    setAutoConnecting(true)
    employeeView.connectToCompany(BigInt(saved)).finally(() => {
      if (!cancelled) setAutoConnecting(false)
    })
    return () => {
      cancelled = true
    }
    // connectToCompany is stable enough for behavior; omitting avoids re-running when signer identity churns
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress, employeeView.connected])

  // Ensure backend has an EmployeeMeta record once connected (needed for KYC, leave, payout)
  const ensuredRef = useRef<string | null>(null)
  useEffect(() => {
    if (!employeeView.connected || !activeAddress || !employeeView.appId) return
    const appIdStr = employeeView.appId.toString()
    const key = `${appIdStr}:${activeAddress}`
    if (ensuredRef.current === key) return
    ensuredRef.current = key
    employeeApi
      .create(appIdStr, { walletAddress: activeAddress, name: 'Employee' })
      .catch(() => {})
  }, [employeeView.connected, activeAddress, employeeView.appId])

  const forgetSavedCompany = () => {
    employeeView.disconnectFromCompany()
    setAppIdInput('')
    ensuredRef.current = null
    enqueueSnackbar('Saved company cleared. Enter a contract App ID to connect.', { variant: 'info' })
  }

  const hasSavedCompanyMapping = Boolean(activeAddress && loadEmployeeContractAppId(activeAddress))

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

    const extractRecords = (txn: Record<string, unknown>, appAddr: string, records: PaymentRecord[]) => {
      const sender = txn.sender as string
      const round = txn['confirmed-round'] as number
      const roundTime = txn['round-time'] as number

      if (sender === appAddr) {
        if (txn['tx-type'] === 'pay' && txn['payment-transaction']) {
          const pt = txn['payment-transaction'] as Record<string, unknown>
          if ((pt.receiver as string) === activeAddress && Number(pt.amount) > 0) {
            records.push({
              id: txn.id as string,
              round,
              timestamp: new Date(roundTime * 1000).toISOString(),
              amount: BigInt(pt.amount as number),
              type: 'algo',
            })
          }
        } else if (txn['tx-type'] === 'axfer' && txn['asset-transfer-transaction']) {
          const at = txn['asset-transfer-transaction'] as Record<string, unknown>
          if ((at.receiver as string) === activeAddress && Number(at.amount) > 0) {
            records.push({
              id: txn.id as string,
              round,
              timestamp: new Date(roundTime * 1000).toISOString(),
              amount: BigInt(at.amount as number),
              type: 'usdc',
            })
          }
        }
      }

      const innerTxns = txn['inner-txns'] as Record<string, unknown>[] | undefined
      if (innerTxns) {
        for (const inner of innerTxns) {
          const innerId = (inner.id as string) || (txn.id as string)
          const innerWithMeta = { ...inner, id: innerId, 'confirmed-round': round, 'round-time': roundTime }
          extractRecords(innerWithMeta, appAddr, records)
        }
      }
    }

    const fetchHistory = async () => {
      setLoadingHistory(true)
      try {
        const indexerConfig = getIndexerConfigFromViteEnvironment()
        const baseUrl = `${indexerConfig.server}${indexerConfig.port ? ':' + indexerConfig.port : ''}`
        const res = await fetch(
          `${baseUrl}/v2/accounts/${activeAddress}/transactions?limit=50`
        )
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        const records: PaymentRecord[] = []
        const appAddr = employeeView.appAddress!
        for (const txn of data.transactions || []) {
          extractRecords(txn, appAddr, records)
        }

        const seen = new Set<string>()
        const unique = records.filter(r => {
          const key = `${r.round}:${r.type}:${r.amount}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

        setPaymentHistory(unique.sort((a, b) => b.round - a.round))
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
    acceptInvite,
    autoConnecting,
    forgetSavedCompany,
    hasSavedCompanyMapping,
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
