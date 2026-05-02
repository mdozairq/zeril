import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { usePayrollContract } from '../hooks/usePayrollContract'
import { useEmployees, type Employee } from '../hooks/useEmployees'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { loadAllEmployeeMeta, loadAllEmployeeMetaAsync, saveCompany, loadCompany, loadCompanyAsync, saveEmployeeMeta, removeEmployeeMeta, type EmployeeMeta } from '../utils/companyStore'
import { microUnitsToUsdc, usdcToMicroUnits } from '../utils/formatUsdc'
import { getAlgoUsdcPrice } from '../utils/tinyman'
import { ellipseAddress } from '../utils/ellipseAddress'
import { auditApi, payrollRunApi, companyApi, employeeApi } from '../services/api'

interface PayrollStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  error?: string
  empAddress?: string
}

interface PayrollContextType {
  // Contract state
  appId: bigint | null
  appAddress: string | null
  isInitialized: boolean
  isBootstrapped: boolean
  /** Contract deployed, initialized, and bootstrapped — required to add employees and run payroll */
  isReady: boolean
  isAdmin: boolean
  loading: boolean
  client: unknown
  employerAddress: string | null
  usdcAssetId: bigint

  // Network info
  network: string
  explorerBase: string

  // Employee data
  employees: Employee[]
  employeesLoading: boolean
  employeeMeta: Record<string, EmployeeMeta>
  activeEmployees: Employee[]
  payableEmployees: Employee[]
  totalPayroll: bigint

  // Treasury
  usdcBalance: bigint
  algoBalance: bigint

  // Company info
  companyName: string
  setCompanyName: (name: string) => void
  appIdStr: string

  // ALGO price
  algoPrice: number
  loadingPrice: boolean
  fetchPrice: () => Promise<void>

  // Actions
  deploy: () => Promise<unknown>
  connectToExisting: (appId: bigint) => Promise<unknown>
  initialize: (usdcAssetId: bigint) => Promise<void>
  bootstrap: () => Promise<void>
  addEmployee: (address: string, salary: bigint) => Promise<void>
  removeEmployee: (address: string) => Promise<void>
  updateSalary: (address: string, newSalary: bigint) => Promise<void>
  setAllocation: (address: string, usdcPct: bigint) => Promise<void>
  setAlgoReceiver: (address: string, receiver: string) => Promise<void>
  payEmployee: (address: string, algoRate: bigint) => Promise<void>
  refreshEmployees: () => void
  getAlgorand: () => ReturnType<typeof usePayrollContract>['getAlgorand'] extends () => infer R ? R : never

  // Setup helpers
  handleSetupCompany: (companyName: string, usdcInput: string) => Promise<void>
  handleConnectExisting: (existingAppId: string) => Promise<void>

  // Add employee helpers
  handleAddEmployee: (meta: {
    name: string
    address: string
    salaryMicroUnits: bigint
    network: string
    settlementType: 'crypto' | 'bank'
    bankDetails?: string
  }) => Promise<void>
  handleRemoveEmployee: (address: string) => Promise<void>

  // Payroll execution
  payrollRunning: boolean
  payrollSteps: PayrollStep[]
  showPayrollModal: boolean
  setShowPayrollModal: (show: boolean) => void
  executePayroll: (runId: string) => Promise<void>

  // Treasury refresh
  refreshTreasury: () => void
}

const PayrollContext = createContext<PayrollContextType | null>(null)

export function usePayroll() {
  const ctx = useContext(PayrollContext)
  if (!ctx) throw new Error('usePayroll must be used within PayrollProvider')
  return ctx
}

export function PayrollProvider({ children }: { children: ReactNode }) {
  const { activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const payroll = usePayrollContract()
  const { employees, loading: employeesLoading, fetchEmployees } = useEmployees()

  const payrollRef = useRef(payroll)
  payrollRef.current = payroll
  const fetchEmployeesRef = useRef(fetchEmployees)
  fetchEmployeesRef.current = fetchEmployees

  const refreshEmployees = useCallback(() => {
    const { client, usdcAssetId, getAlgorand } = payrollRef.current
    if (client) {
      const algorand = getAlgorand()
      fetchEmployeesRef.current(client, algorand, usdcAssetId)
    }
  }, [])

  const clientId = payroll.client ? payroll.appId : null
  useEffect(() => {
    if (clientId !== null) refreshEmployees()
  }, [clientId, refreshEmployees])

  const network = getAlgodConfigFromViteEnvironment().network
  const [companyName, setCompanyName] = useState('')
  const [usdcBalance, setUsdcBalance] = useState<bigint>(0n)
  const [algoBalance, setAlgoBalance] = useState<bigint>(0n)
  const [algoPrice, setAlgoPrice] = useState(0)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [showPayrollModal, setShowPayrollModal] = useState(false)
  const [payrollRunning, setPayrollRunning] = useState(false)
  const [payrollSteps, setPayrollSteps] = useState<PayrollStep[]>([])

  const explorerBase = network === 'mainnet'
    ? 'https://explorer.perawallet.app'
    : 'https://testnet.explorer.perawallet.app'

  const isReady =
    payroll.appId !== null && payroll.isInitialized && payroll.isBootstrapped
  const appIdStr = payroll.appId?.toString() ?? ''
  const employeeMeta = loadAllEmployeeMeta(appIdStr)
  const activeEmployees = employees.filter(e => e.isActive)
  const payableEmployees = activeEmployees.filter(e => e.optedIntoUsdc)
  const totalPayroll = payableEmployees.reduce((sum, e) => sum + e.salary, 0n)

  useEffect(() => {
    if (appIdStr) {
      const meta = loadCompany(appIdStr)
      if (meta) setCompanyName(meta.name)
      // Also sync from backend
      loadCompanyAsync(appIdStr).then(m => { if (m) setCompanyName(m.name) })
      loadAllEmployeeMetaAsync(appIdStr).catch(() => {})
    }
  }, [appIdStr])

  // Ensure backend knows the company admin (needed for protected admin actions)
  useEffect(() => {
    if (!appIdStr || !activeAddress || !payroll.isAdmin) return
    companyApi.upsert({
      appId: appIdStr,
      name: companyName || 'Company',
      network,
      treasuryAsset: 'USDC',
      adminAddress: activeAddress,
    }).catch(() => {})
  }, [appIdStr, activeAddress, payroll.isAdmin, companyName, network])

  const refreshTreasury = useCallback(() => {
    if (!payroll.appAddress || !isReady) return
    const algorand = payroll.getAlgorand()
    algorand.account.getInformation(payroll.appAddress).then(info => {
      setAlgoBalance(info.balance?.microAlgo ?? 0n)
      if (payroll.usdcAssetId > 0n) {
        const h = info.assets?.find(a => a.assetId === payroll.usdcAssetId)
        setUsdcBalance(h?.amount ?? 0n)
      }
    }).catch(() => { setUsdcBalance(0n); setAlgoBalance(0n) })
  }, [payroll.appAddress, payroll.usdcAssetId, isReady, payroll.getAlgorand])

  useEffect(() => { refreshTreasury() }, [refreshTreasury])

  const fetchPrice = async () => {
    setLoadingPrice(true)
    try {
      const p = await getAlgoUsdcPrice(network)
      setAlgoPrice(p)
    } catch {
      enqueueSnackbar('Failed to fetch ALGO price', { variant: 'error' })
    } finally {
      setLoadingPrice(false)
    }
  }

  const handleSetupCompany = async (name: string, usdcInput: string) => {
    if (!name.trim()) {
      enqueueSnackbar('Enter a company name', { variant: 'error' })
      return
    }
    try {
      enqueueSnackbar('Deploying contract...', { variant: 'info' })
      const client = await payroll.deploy()
      if (!client) throw new Error('Deploy failed')

      const newAppId = (client as { appId: bigint }).appId.toString()
      saveCompany(newAppId, {
        name: name.trim(),
        appId: newAppId,
        network,
        treasuryAsset: 'USDC',
        adminAddress: activeAddress ?? undefined,
      })
      setCompanyName(name.trim())

      enqueueSnackbar('Initializing with USDC...', { variant: 'info' })
      await payroll.initialize(BigInt(usdcInput))

      enqueueSnackbar('Bootstrapping (opt into USDC)...', { variant: 'info' })
      await payroll.bootstrap()

      enqueueSnackbar('Company setup complete!', { variant: 'success' })

      if (activeAddress) {
        auditApi.create({
          companyAppId: newAppId,
          action: 'contract_deployed',
          actorAddress: activeAddress,
          entityType: 'contract',
          entityId: newAppId,
          metadata: { usdcInput, companyName: name.trim() },
        }).catch(() => {})
      }
    } catch (e) {
      enqueueSnackbar(`Setup failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { variant: 'error' })
      throw e
    }
  }

  const handleConnectExisting = async (existingAppId: string) => {
    if (!existingAppId) return
    try {
      await payroll.connectToExisting(BigInt(existingAppId))
      enqueueSnackbar('Connected to existing contract', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(`Failed: ${e instanceof Error ? e.message : 'Unknown'}`, { variant: 'error' })
      throw e
    }
  }

  const handleAddEmployee = async (meta: {
    name: string
    address: string
    salaryMicroUnits: bigint
    network: string
    settlementType: 'crypto' | 'bank'
    bankDetails?: string
  }) => {
    const { name, address, salaryMicroUnits, network, settlementType, bankDetails } = meta
    if (!address || salaryMicroUnits <= 0n) return
    if (!payroll.isInitialized || !payroll.isBootstrapped) {
      enqueueSnackbar('Finish Initialize and Bootstrap in Settings before adding employees.', { variant: 'error' })
      return
    }
    try {
      if (appIdStr) {
        saveEmployeeMeta(appIdStr, address, {
          name: name || 'Unnamed',
          network,
          settlementType,
          bankDetails: settlementType === 'bank' ? bankDetails : undefined,
        })
      }
      await payroll.addEmployee(address, salaryMicroUnits)

      if (appIdStr) {
        await employeeApi
          .create(appIdStr, {
            walletAddress: address,
            name: name || 'Unnamed',
            network,
            settlementType,
            ...(settlementType === 'bank' && bankDetails ? { bankDetails } : {}),
          })
          .catch(() => {})
      }

      enqueueSnackbar(`${name || 'Employee'} added to payroll`, { variant: 'success' })
      refreshEmployees()

      if (appIdStr && activeAddress) {
        auditApi.create({
          companyAppId: appIdStr,
          action: 'employee_added',
          actorAddress: activeAddress,
          entityType: 'employee',
          entityId: address,
          metadata: { name, salaryMicroUnits: salaryMicroUnits.toString() },
        }).catch(() => {})
      }
    } catch (e) {
      enqueueSnackbar(`Failed: ${e instanceof Error ? e.message : 'Unknown'}`, { variant: 'error' })
      throw e
    }
  }

  const handleRemoveEmployee = async (address: string) => {
    try {
      await payroll.removeEmployee(address)
      if (appIdStr) removeEmployeeMeta(appIdStr, address)
      if (appIdStr) {
        await employeeApi.remove(appIdStr, address).catch(() => {})
      }
      enqueueSnackbar('Employee removed', { variant: 'success' })
      refreshEmployees()

      if (appIdStr && activeAddress) {
        auditApi.create({
          companyAppId: appIdStr,
          action: 'employee_removed',
          actorAddress: activeAddress,
          entityType: 'employee',
          entityId: address,
        }).catch(() => {})
      }
    } catch (e) {
      enqueueSnackbar(`Failed: ${e instanceof Error ? e.message : 'Unknown'}`, { variant: 'error' })
      throw e
    }
  }

  const updateStep = (id: string, u: Partial<PayrollStep>) => {
    setPayrollSteps(prev => prev.map(s => s.id === id ? { ...s, ...u } : s))
  }

  const executePayroll = async (runId: string) => {
    setShowPayrollModal(true)
    setPayrollRunning(true)

    let algoRate = 1_000_000n
    if (algoPrice > 0) algoRate = BigInt(Math.round((1 / algoPrice) * 1_000_000))

    const initial: PayrollStep[] = [
      { id: 'preflight', label: `Preflight — ${payableEmployees.length} employee(s)${algoPrice > 0 ? `, $${algoPrice.toFixed(4)}/ALGO` : ''}`, status: 'done' },
      ...payableEmployees.map(emp => ({
        id: `pay_${emp.address}`,
        label: `${employeeMeta[emp.address]?.name || ellipseAddress(emp.address, 6)} — $${microUnitsToUsdc(emp.salary)}`,
        status: 'pending' as const,
        empAddress: emp.address,
      }))
    ]
    setPayrollSteps(initial)

    payrollRunApi.update(runId, { status: 'processing' }).catch(() => {})

    let paid = 0, failed = 0
    for (const emp of payableEmployees) {
      const sid = `pay_${emp.address}`
      const name = employeeMeta[emp.address]?.name || ellipseAddress(emp.address, 6)
      updateStep(sid, { status: 'running', label: `Paying ${name}...` })
      try {
        await payroll.payEmployee(emp.address, algoRate)
        updateStep(sid, { status: 'done', label: `${name} — $${microUnitsToUsdc(emp.salary)} sent` })
        paid++
      } catch (e) {
        updateStep(sid, { status: 'error', label: `${name} — failed`, error: (e instanceof Error ? e.message : 'Unknown').slice(0, 100) })
        failed++
      }
    }

    setPayrollSteps(prev => [...prev, {
      id: 'summary',
      label: failed === 0 ? `Payroll complete — ${paid} paid` : `Done — ${paid} paid, ${failed} failed`,
      status: failed === 0 ? 'done' : 'error',
    }])

    setPayrollRunning(false)
    enqueueSnackbar(failed === 0 ? `${paid} employee(s) paid` : `${failed} failed`, { variant: failed === 0 ? 'success' : 'error' })
    refreshEmployees()
    refreshTreasury()

    const finalStatus = failed === 0 ? 'completed' : 'partial'
    payrollRunApi.update(runId, {
      totalAmount: totalPayroll.toString(),
      employeesPaid: paid,
      employeesFailed: failed,
      algoRate: algoRate.toString(),
      status: finalStatus,
    }).catch(() => {})

    if (appIdStr && activeAddress) {
      auditApi.create({
        companyAppId: appIdStr,
        action: 'payroll_executed',
        actorAddress: activeAddress,
        entityType: 'payroll_run',
        entityId: runId,
        metadata: { paid, failed, totalPayroll: totalPayroll.toString(), algoRate: algoRate.toString() },
      }).catch(() => {})
    }
  }

  const value: PayrollContextType = {
    appId: payroll.appId,
    appAddress: payroll.appAddress,
    isInitialized: payroll.isInitialized,
    isBootstrapped: payroll.isBootstrapped,
    isReady,
    isAdmin: payroll.isAdmin,
    loading: payroll.loading,
    client: payroll.client,
    employerAddress: payroll.employerAddress,
    usdcAssetId: payroll.usdcAssetId,
    network,
    explorerBase,
    employees,
    employeesLoading,
    employeeMeta,
    activeEmployees,
    payableEmployees,
    totalPayroll,
    usdcBalance,
    algoBalance,
    companyName,
    setCompanyName,
    appIdStr,
    algoPrice,
    loadingPrice,
    fetchPrice,
    deploy: payroll.deploy,
    connectToExisting: payroll.connectToExisting,
    initialize: payroll.initialize,
    bootstrap: payroll.bootstrap,
    addEmployee: payroll.addEmployee,
    removeEmployee: payroll.removeEmployee,
    updateSalary: payroll.updateSalary,
    setAllocation: payroll.setAllocation,
    setAlgoReceiver: payroll.setAlgoReceiver,
    payEmployee: payroll.payEmployee,
    refreshEmployees,
    getAlgorand: payroll.getAlgorand,
    handleSetupCompany,
    handleConnectExisting,
    handleAddEmployee,
    handleRemoveEmployee,
    payrollRunning,
    payrollSteps,
    showPayrollModal,
    setShowPayrollModal,
    executePayroll,
    refreshTreasury,
  }

  return (
    <PayrollContext.Provider value={value}>
      {children}
    </PayrollContext.Provider>
  )
}
