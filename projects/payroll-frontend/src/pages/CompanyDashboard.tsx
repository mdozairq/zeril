import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { usePayrollContract } from '../hooks/usePayrollContract'
import { useEmployees, Employee } from '../hooks/useEmployees'
import { ellipseAddress } from '../utils/ellipseAddress'
import { microUnitsToUsdc, formatUsdcDisplay, usdcToMicroUnits } from '../utils/formatUsdc'
import { saveCompany, loadCompany, loadAllEmployeeMeta, saveEmployeeMeta } from '../utils/companyStore'
import { getAlgoUsdcPrice } from '../utils/tinyman'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface CompanyDashboardProps {
  onBack: () => void
  onConnectWallet: () => void
}

// ── Payroll step-by-step modal ──
interface PayrollStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  error?: string
  empAddress?: string
}

export default function CompanyDashboard({ onBack, onConnectWallet }: CompanyDashboardProps) {
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

  // ── Local state ──
  const network = getAlgodConfigFromViteEnvironment().network
  const [companyName, setCompanyName] = useState('')
  const [usdcInput, setUsdcInput] = useState(network === 'mainnet' ? '31566704' : '10458941')
  const [existingAppId, setExistingAppId] = useState('')
  const [connectMode, setConnectMode] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)

  // Treasury
  const [usdcBalance, setUsdcBalance] = useState<bigint>(0n)
  const [algoBalance, setAlgoBalance] = useState<bigint>(0n)

  // Add employee
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [empName, setEmpName] = useState('')
  const [empAddress, setEmpAddress] = useState('')
  const [empSalary, setEmpSalary] = useState('')
  const [empLoading, setEmpLoading] = useState(false)

  // Payroll
  const [algoPrice, setAlgoPrice] = useState(0)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [showPayrollModal, setShowPayrollModal] = useState(false)
  const [payrollRunning, setPayrollRunning] = useState(false)
  const [payrollSteps, setPayrollSteps] = useState<PayrollStep[]>([])

  const explorerBase = network === 'mainnet'
    ? 'https://explorer.perawallet.app'
    : 'https://testnet.explorer.perawallet.app'

  const isReady = payroll.appId !== null && payroll.isInitialized && payroll.isBootstrapped
  const appIdStr = payroll.appId?.toString() ?? ''
  const employeeMeta = loadAllEmployeeMeta(appIdStr)
  const activeEmployees = employees.filter(e => e.isActive)
  const payableEmployees = activeEmployees.filter(e => e.optedIntoUsdc)
  const totalPayroll = payableEmployees.reduce((sum, e) => sum + e.salary, 0n)

  // Load company name
  useEffect(() => {
    if (appIdStr) {
      const meta = loadCompany(appIdStr)
      if (meta) setCompanyName(meta.name)
    }
  }, [appIdStr])

  // Load treasury balances
  useEffect(() => {
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

  // ── Setup: one-click deploy + init + bootstrap ──
  const handleSetupCompany = async () => {
    if (!companyName.trim()) {
      enqueueSnackbar('Enter a company name', { variant: 'error' })
      return
    }
    setSetupLoading(true)
    try {
      // 1. Deploy
      enqueueSnackbar('Deploying contract...', { variant: 'info' })
      const client = await payroll.deploy()
      if (!client) throw new Error('Deploy failed')

      // Save company meta
      const newAppId = client.appId.toString()
      saveCompany(newAppId, {
        name: companyName.trim(),
        appId: newAppId,
        network,
        treasuryAsset: 'USDC',
      })

      // 2. Initialize
      enqueueSnackbar('Initializing with USDC...', { variant: 'info' })
      await payroll.initialize(BigInt(usdcInput))

      // 3. Bootstrap
      enqueueSnackbar('Bootstrapping (opt into USDC)...', { variant: 'info' })
      await payroll.bootstrap()

      enqueueSnackbar('Company setup complete!', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(`Setup failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { variant: 'error' })
    } finally {
      setSetupLoading(false)
    }
  }

  const handleConnectExisting = async () => {
    if (!existingAppId) return
    setSetupLoading(true)
    try {
      await payroll.connectToExisting(BigInt(existingAppId))
      enqueueSnackbar('Connected to existing contract', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(`Failed: ${e instanceof Error ? e.message : 'Unknown'}`, { variant: 'error' })
    } finally {
      setSetupLoading(false)
    }
  }

  // ── Add employee ──
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empAddress || !empSalary) return
    setEmpLoading(true)
    try {
      if (appIdStr) {
        saveEmployeeMeta(appIdStr, empAddress, {
          name: empName || 'Unnamed',
          network: 'algorand',
          settlementType: 'crypto',
        })
      }
      await payroll.addEmployee(empAddress, usdcToMicroUnits(parseFloat(empSalary)))
      enqueueSnackbar(`${empName || 'Employee'} added to payroll`, { variant: 'success' })
      setEmpName(''); setEmpAddress(''); setEmpSalary('')
      setShowAddEmployee(false)
      refreshEmployees()
    } catch (e) {
      enqueueSnackbar(`Failed: ${e instanceof Error ? e.message : 'Unknown'}`, { variant: 'error' })
    } finally {
      setEmpLoading(false)
    }
  }

  const handleRemoveEmployee = async (address: string) => {
    try {
      await payroll.removeEmployee(address)
      enqueueSnackbar('Employee removed', { variant: 'success' })
      refreshEmployees()
    } catch (e) {
      enqueueSnackbar(`Failed: ${e instanceof Error ? e.message : 'Unknown'}`, { variant: 'error' })
    }
  }

  // ── Payroll ──
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

  const updateStep = (id: string, u: Partial<PayrollStep>) => {
    setPayrollSteps(prev => prev.map(s => s.id === id ? { ...s, ...u } : s))
  }

  const executePayroll = async () => {
    setShowPayrollModal(true)
    setPayrollRunning(true)

    // Default 1 ALGO = 1 USDC (rate = 1_000_000 microALGO per USDC) when price not fetched
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
  }

  // ── Not connected ──
  if (!activeAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
        <div className="flex flex-col items-center mb-8">
          <span className="font-serif italic text-[48px] leading-none">Z</span>
          <span className="font-mono text-[8px] tracking-[0.3em] uppercase -mt-1" style={{ color: 'rgba(250,250,247,0.4)' }}>eril</span>
        </div>
        <h2 className="text-2xl font-light mb-4">Connect Your Wallet</h2>
        <p className="text-sm mb-8 text-center max-w-sm" style={{ color: 'rgba(250,250,247,0.45)' }}>
          Connect your Algorand wallet to set up or manage your company payroll.
        </p>
        <button onClick={onConnectWallet} className="btn btn-primary btn-sm px-8">Connect Wallet</button>
        <button onClick={onBack} className="mt-4 text-xs opacity-40 hover:opacity-60">&larr; Back</button>
      </div>
    )
  }

  // ── Loading state ──
  if (payroll.loading && !payroll.client) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
        <div className="text-center">
          <span className="loading loading-spinner loading-lg" />
          <p className="mt-4 text-sm opacity-50">Discovering contract...</p>
        </div>
      </div>
    )
  }

  // ── Access denied ──
  if (payroll.isInitialized && !payroll.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-error mb-4">Access Denied</h1>
          <p className="text-sm opacity-50 mb-4">This payroll contract is managed by a different wallet.</p>
          <p className="text-xs opacity-30 font-mono break-all mb-2">Employer: {payroll.employerAddress}</p>
          <p className="text-xs opacity-30 font-mono break-all mb-6">Connected: {activeAddress}</p>
          <div className="flex gap-2 justify-center">
            <button className="btn btn-primary btn-sm" onClick={onConnectWallet}>Switch Wallet</button>
            <button className="btn btn-ghost btn-sm" onClick={onBack}>Back</button>
          </div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────
  // MAIN SINGLE-PAGE DASHBOARD
  // ────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
      {/* Top bar */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'rgba(250,250,247,0.08)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-xs opacity-40 hover:opacity-60">&larr;</button>
          <div className="flex flex-col">
            <span className="font-serif italic text-lg leading-none">Z</span>
            <span className="font-mono text-[6px] tracking-[0.3em] uppercase -mt-0.5 opacity-40">eril</span>
          </div>
          {isReady && companyName && (
            <span className="text-xs opacity-40 ml-2">{companyName}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 text-[10px] font-mono rounded" style={{ backgroundColor: 'rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.5)', border: '1px solid rgba(250,250,247,0.08)' }}>{network}</span>
          <button onClick={onConnectWallet} className="font-mono text-xs" style={{ color: 'rgba(250,250,247,0.5)' }}>
            {ellipseAddress(activeAddress)}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ═══════════════════════════════════════
            SECTION 1: SETUP (only if not ready)
            ═══════════════════════════════════════ */}
        {!isReady && (
          <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
            <div className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Step 1</div>
            <h2 className="text-xl font-semibold mb-6">Set up your company</h2>

            {payroll.appId === null ? (
              // No contract yet — create or connect
              <div className="space-y-5">
                {!connectMode ? (
                  <>
                    <div>
                      <label className="text-[10px] font-mono tracking-wider uppercase block mb-1.5" style={{ color: 'rgba(250,250,247,0.4)' }}>Company Name</label>
                      <input
                        type="text"
                        placeholder="Acme Corp"
                        className="input input-bordered input-sm w-full max-w-md"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono tracking-wider uppercase block mb-1.5" style={{ color: 'rgba(250,250,247,0.4)' }}>Treasury Asset (USDC ID)</label>
                      <input
                        type="text"
                        className="input input-bordered input-sm w-full max-w-md"
                        value={usdcInput}
                        onChange={e => setUsdcInput(e.target.value)}
                      />
                      <p className="text-[10px] mt-1 font-mono" style={{ color: 'rgba(250,250,247,0.3)' }}>
                        {network === 'testnet' ? 'Testnet USDC: 10458941' : 'Mainnet USDC: 31566704'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                      <button
                        onClick={handleSetupCompany}
                        disabled={setupLoading || !companyName.trim()}
                        className="btn btn-primary btn-sm px-8"
                      >
                        {setupLoading ? <span className="loading loading-spinner loading-xs" /> : 'Create Company Contract'}
                      </button>
                      <button
                        onClick={() => setConnectMode(true)}
                        className="text-xs opacity-40 hover:opacity-70 transition-opacity"
                      >
                        or connect existing contract
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] font-mono tracking-wider uppercase block mb-1.5" style={{ color: 'rgba(250,250,247,0.4)' }}>Existing App ID</label>
                      <div className="flex gap-2 max-w-md">
                        <input
                          type="text"
                          placeholder="e.g. 758636940"
                          className="input input-bordered input-sm flex-1"
                          value={existingAppId}
                          onChange={e => setExistingAppId(e.target.value)}
                        />
                        <button onClick={handleConnectExisting} disabled={setupLoading || !existingAppId} className="btn btn-primary btn-sm">
                          {setupLoading ? <span className="loading loading-spinner loading-xs" /> : 'Connect'}
                        </button>
                      </div>
                    </div>
                    <button onClick={() => setConnectMode(false)} className="text-xs opacity-40 hover:opacity-70">
                      &larr; Back to create new
                    </button>
                  </>
                )}
              </div>
            ) : (
              // Contract exists but needs init/bootstrap
              <div className="space-y-4">
                <div className="text-xs space-y-1" style={{ color: 'rgba(250,250,247,0.5)' }}>
                  <div>App ID: <span className="font-mono">{payroll.appId.toString()}</span></div>
                  <div className="flex gap-2 mt-2">
                    <span className={`badge badge-sm ${payroll.isInitialized ? 'badge-success' : 'badge-warning'}`}>
                      {payroll.isInitialized ? 'Initialized' : 'Not Initialized'}
                    </span>
                    <span className={`badge badge-sm ${payroll.isBootstrapped ? 'badge-success' : 'badge-warning'}`}>
                      {payroll.isBootstrapped ? 'Bootstrapped' : 'Not Bootstrapped'}
                    </span>
                  </div>
                </div>

                {!payroll.isInitialized && (
                  <div className="flex gap-2 items-end max-w-md">
                    <div className="flex-1">
                      <label className="text-[10px] font-mono tracking-wider uppercase block mb-1.5" style={{ color: 'rgba(250,250,247,0.4)' }}>USDC Asset ID</label>
                      <input type="text" className="input input-bordered input-sm w-full" value={usdcInput} onChange={e => setUsdcInput(e.target.value)} />
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await payroll.initialize(BigInt(usdcInput))
                          enqueueSnackbar('Initialized!', { variant: 'success' })
                        } catch (e) { enqueueSnackbar(`Failed: ${e instanceof Error ? e.message : ''}`, { variant: 'error' }) }
                      }}
                      disabled={payroll.loading}
                      className="btn btn-primary btn-sm"
                    >
                      Initialize
                    </button>
                  </div>
                )}

                {payroll.isInitialized && !payroll.isBootstrapped && (
                  <button
                    onClick={async () => {
                      try {
                        await payroll.bootstrap()
                        enqueueSnackbar('Bootstrapped! Contract is ready.', { variant: 'success' })
                      } catch (e) { enqueueSnackbar(`Failed: ${e instanceof Error ? e.message : ''}`, { variant: 'error' }) }
                    }}
                    disabled={payroll.loading}
                    className="btn btn-primary btn-sm"
                  >
                    {payroll.loading ? <span className="loading loading-spinner loading-xs" /> : 'Bootstrap (Opt into USDC)'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════
            SECTION 2: TREASURY (only when ready)
            ═══════════════════════════════════════ */}
        {isReady && (
          <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>
                  Treasury · App {appIdStr}
                </div>
              </div>
              <a
                href={`${explorerBase}/application/${appIdStr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono opacity-30 hover:opacity-60"
              >
                {ellipseAddress(payroll.appAddress ?? '', 8)} ↗
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>USDC</div>
                <div className="text-xl font-bold font-mono">${microUnitsToUsdc(usdcBalance)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>ALGO</div>
                <div className="text-xl font-bold font-mono">{(Number(algoBalance) / 1_000_000).toFixed(4)}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Employees</div>
                <div className="text-xl font-bold">{activeEmployees.length}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Monthly</div>
                <div className="text-xl font-bold font-mono">${microUnitsToUsdc(totalPayroll)}</div>
              </div>
            </div>

            {usdcBalance < totalPayroll && activeEmployees.length > 0 && (
              <div className="mt-4 p-3 rounded-lg text-xs flex items-center gap-2" style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#FBBF24' }}>
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                Fund the contract with USDC to run payroll. Send USDC to: <span className="font-mono">{ellipseAddress(payroll.appAddress ?? '', 8)}</span>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════
            SECTION 3: EMPLOYEES (only when ready)
            ═══════════════════════════════════════ */}
        {isReady && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
              <div>
                <div className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Payroll</div>
                <div className="text-sm font-semibold">Employees ({employees.length})</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={refreshEmployees} disabled={employeesLoading} className="btn btn-ghost btn-xs text-xs">
                  {employeesLoading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
                </button>
                <button onClick={() => setShowAddEmployee(true)} className="btn btn-primary btn-xs text-xs">
                  + Add Employee
                </button>
              </div>
            </div>

            {employees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Address</th>
                      <th>Salary</th>
                      <th>Split</th>
                      <th>USDC</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => {
                      const meta = employeeMeta[emp.address]
                      const algoPct = 100 - emp.usdcPercentage
                      return (
                        <tr key={emp.address}>
                          <td className="text-xs font-medium">{meta?.name || 'Unnamed'}</td>
                          <td className="font-mono text-[10px] opacity-60">{ellipseAddress(emp.address, 6)}</td>
                          <td className="font-mono text-xs">{formatUsdcDisplay(emp.salary)}</td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.06)' }}>
                                <div className="h-full flex">
                                  {emp.usdcPercentage > 0 && <div style={{ width: `${emp.usdcPercentage}%`, backgroundColor: 'rgba(74,222,128,0.5)' }} />}
                                  {algoPct > 0 && <div style={{ width: `${algoPct}%`, backgroundColor: 'rgba(250,250,247,0.25)' }} />}
                                </div>
                              </div>
                              <span className="font-mono text-[10px] opacity-40">{emp.usdcPercentage}/{algoPct}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`badge badge-xs ${emp.optedIntoUsdc ? 'badge-success' : 'badge-warning'}`}>
                              {emp.optedIntoUsdc ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-xs ${emp.isActive ? 'badge-success' : 'badge-error'}`}>
                              {emp.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            {emp.isActive && (
                              <button onClick={() => handleRemoveEmployee(emp.address)} disabled={payroll.loading} className="btn btn-ghost btn-xs text-error text-[10px]">
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-sm opacity-40">
                No employees yet. Click "Add Employee" to get started.
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════
            SECTION 4: RUN PAYROLL (only when ready + has employees)
            ═══════════════════════════════════════ */}
        {isReady && activeEmployees.length > 0 && (
          <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-mono tracking-widest uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Execute</div>
                <div className="text-sm font-semibold">Run Payroll</div>
              </div>
              <button onClick={fetchPrice} disabled={loadingPrice} className="btn btn-ghost btn-xs text-xs">
                {loadingPrice ? <span className="loading loading-spinner loading-xs" /> : 'Fetch ALGO Price'}
              </button>
            </div>

            {/* Breakdown */}
            <div className="overflow-x-auto mb-4">
              <table className="table table-xs w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>USDC</th>
                    <th>ALGO</th>
                    {algoPrice > 0 && <th>ALGO Tokens</th>}
                  </tr>
                </thead>
                <tbody>
                  {activeEmployees.map(emp => {
                    const meta = employeeMeta[emp.address]
                    const usdcAmt = Number(emp.salary) * emp.usdcPercentage / 100
                    const algoUsdcAmt = Number(emp.salary) * (100 - emp.usdcPercentage) / 100
                    const algoTokens = algoPrice > 0 ? (algoUsdcAmt / 1_000_000) / algoPrice : 0
                    return (
                      <tr key={emp.address} className={!emp.optedIntoUsdc ? 'opacity-40' : ''}>
                        <td className="text-xs">{meta?.name || 'Unnamed'} {!emp.optedIntoUsdc && <span className="text-warning text-[9px]">(no USDC opt-in)</span>}</td>
                        <td className="font-mono text-xs">${microUnitsToUsdc(BigInt(Math.round(usdcAmt)))}</td>
                        <td className="font-mono text-xs">${microUnitsToUsdc(BigInt(Math.round(algoUsdcAmt)))}</td>
                        {algoPrice > 0 && <td className="font-mono text-xs">{algoTokens > 0 ? `~${algoTokens.toFixed(2)}` : '—'}</td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {algoPrice > 0 && (
              <div className="text-[10px] font-mono mb-4" style={{ color: 'rgba(250,250,247,0.3)' }}>
                Tinyman {network} · 1 ALGO = ${algoPrice.toFixed(4)} USDC
              </div>
            )}

            <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(250,250,247,0.06)' }}>
              <div className="text-xs" style={{ color: 'rgba(250,250,247,0.4)' }}>
                {payableEmployees.length} payable · ${microUnitsToUsdc(totalPayroll)} total
              </div>
              <button
                onClick={executePayroll}
                disabled={payrollRunning || payableEmployees.length === 0 || usdcBalance < totalPayroll}
                className="btn btn-primary btn-sm px-6"
              >
                {payrollRunning ? <span className="loading loading-spinner loading-xs" /> : 'Run Payroll'}
              </button>
            </div>
          </div>
        )}

        {/* Share App ID hint */}
        {isReady && (
          <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'rgba(250,250,247,0.02)', border: '1px dashed rgba(250,250,247,0.08)' }}>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.3)' }}>Share with employees</div>
            <div className="font-mono text-lg font-bold">{appIdStr}</div>
            <p className="text-xs mt-2" style={{ color: 'rgba(250,250,247,0.3)' }}>
              Employees use this App ID to connect and configure their token allocation.
            </p>
          </div>
        )}
      </div>

      {/* ═══ Add Employee Modal ═══ */}
      {showAddEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={e => e.target === e.currentTarget && setShowAddEmployee(false)}>
          <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(250,250,247,0.1)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(250,250,247,0.08)' }}>
              <span className="text-sm font-semibold">Add Employee</span>
              <button onClick={() => setShowAddEmployee(false)} className="text-xs opacity-40 hover:opacity-70">Close</button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-mono tracking-wider uppercase block mb-1.5" style={{ color: 'rgba(250,250,247,0.4)' }}>Name</label>
                <input type="text" placeholder="Alice Chen" className="input input-bordered input-sm w-full" value={empName} onChange={e => setEmpName(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-mono tracking-wider uppercase block mb-1.5" style={{ color: 'rgba(250,250,247,0.4)' }}>Wallet Address</label>
                <input type="text" placeholder="Algorand address (58 chars)" className="input input-bordered input-sm w-full" value={empAddress} onChange={e => setEmpAddress(e.target.value)} required />
              </div>
              <div>
                <label className="text-[10px] font-mono tracking-wider uppercase block mb-1.5" style={{ color: 'rgba(250,250,247,0.4)' }}>Monthly Salary (USDC)</label>
                <input type="number" step="0.01" min="0" placeholder="5000" className="input input-bordered input-sm w-full" value={empSalary} onChange={e => setEmpSalary(e.target.value)} required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddEmployee(false)} className="flex-1 btn btn-ghost btn-sm text-xs">Cancel</button>
                <button type="submit" disabled={empLoading || !empAddress || !empSalary} className="flex-1 btn btn-primary btn-sm text-xs">
                  {empLoading ? <span className="loading loading-spinner loading-xs" /> : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ Payroll Progress Modal ═══ */}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(250,250,247,0.1)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(250,250,247,0.08)' }}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                <span className="text-sm font-semibold">Payroll Execution</span>
              </div>
              {!payrollRunning && (
                <button onClick={() => setShowPayrollModal(false)} className="text-xs opacity-40 hover:opacity-70">Close</button>
              )}
            </div>

            <div className="px-6 py-5 space-y-3 max-h-[400px] overflow-y-auto">
              {payrollSteps.map(step => (
                <div key={step.id} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {step.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full" style={{ border: '1.5px solid rgba(250,250,247,0.15)' }} />}
                    {step.status === 'running' && <span className="loading loading-spinner loading-xs" style={{ color: '#FBBF24' }} />}
                    {step.status === 'done' && <svg className="w-3.5 h-3.5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    {step.status === 'error' && <svg className="w-3.5 h-3.5 text-error" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs ${step.status === 'error' ? 'text-error' : step.status === 'done' ? '' : 'opacity-50'}`}>{step.label}</div>
                    {step.error && <div className="text-[10px] mt-0.5 text-error opacity-70">{step.error}</div>}
                    {step.status === 'done' && step.empAddress && (
                      <a href={`${explorerBase}/address/${step.empAddress}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] opacity-30 hover:opacity-60">
                        {ellipseAddress(step.empAddress, 8)} ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!payrollRunning && payrollSteps.length > 0 && (
              <div className="px-6 pb-5">
                <button onClick={() => setShowPayrollModal(false)} className="w-full py-2.5 text-xs font-mono tracking-wider opacity-50 hover:opacity-80 transition-opacity rounded-lg" style={{ border: '1px solid rgba(250,250,247,0.1)' }}>
                  CLOSE
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
