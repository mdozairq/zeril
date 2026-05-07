import { usePayroll } from '../contexts/PayrollContext'
import { microUnitsToUsdc } from '../utils/formatUsdc'
import { ellipseAddress } from '../utils/ellipseAddress'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { payrollRunApi, custodyApi, companyApi, employeeApi, type PayrollRunData, type CustodySummary, type EmployeeMetaData } from '../services/api'

type View = 'list' | 'detail'

const RunPayroll = () => {
  const { activeAddress } = useWallet()
  const {
    activeEmployees, payableEmployees, totalPayroll, employeeMeta,
    usdcBalance, algoBalance, algoPrice, loadingPrice, fetchPrice,
    network, explorerBase,
    payrollRunning, payrollSteps, showPayrollModal, setShowPayrollModal,
    executePayroll,
    appIdStr, companyName,
  } = usePayroll()

  const [view, setView] = useState<View>('list')
  const [runs, setRuns] = useState<PayrollRunData[]>([])
  const [runsLoading, setRunsLoading] = useState(false)
  const [selectedRun, setSelectedRun] = useState<PayrollRunData | null>(null)

  const [newRunName, setNewRunName] = useState('')
  const [creating, setCreating] = useState(false)

  const [custody, setCustody] = useState<CustodySummary | null>(null)
  const [backendMeta, setBackendMeta] = useState<EmployeeMetaData[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())

  const backendMap = useMemo(() => new Map(backendMeta.map(m => [m.walletAddress, m])), [backendMeta])

  const notOptedIn = activeEmployees.filter(e => !e.optedIntoUsdc)

  const isEligible = useCallback((addr: string) => {
    const emp = activeEmployees.find(e => e.address === addr)
    if (!emp || !emp.optedIntoUsdc) return false
    const dbMeta = backendMap.get(addr)
    return dbMeta?.kycStatus === 'approved'
  }, [activeEmployees, backendMap])

  const kycPendingCount = useMemo(() => {
    return activeEmployees.filter(e => {
      const dbMeta = backendMap.get(e.address)
      return e.optedIntoUsdc && dbMeta?.kycStatus !== 'approved'
    }).length
  }, [activeEmployees, backendMap])

  const selectedTotal = useMemo(() => {
    return activeEmployees
      .filter(e => selectedEmployees.has(e.address))
      .reduce((sum, e) => sum + e.salary, 0n)
  }, [activeEmployees, selectedEmployees])

  const hasSufficientFunds = usdcBalance >= selectedTotal
  const accruedYield = custody ? BigInt(custody.accruedYield) : 0n
  const effectiveUsdc = usdcBalance + accruedYield

  const loadRuns = useCallback(async () => {
    if (!appIdStr) return
    setRunsLoading(true)
    try {
      const data = await payrollRunApi.list(appIdStr, 50)
      setRuns(data)
    } catch {
      setRuns([])
    } finally {
      setRunsLoading(false)
    }
  }, [appIdStr])

  useEffect(() => { loadRuns() }, [loadRuns])

  useEffect(() => {
    if (!appIdStr) return
    custodyApi.get(appIdStr).then(setCustody).catch(() => setCustody(null))
  }, [appIdStr])

  useEffect(() => {
    if (!appIdStr) return
    employeeApi.list(appIdStr).then(setBackendMeta).catch(() => setBackendMeta([]))
  }, [appIdStr])

  // Auto-select all eligible employees when entering detail view
  useEffect(() => {
    if (view === 'detail') {
      const eligible = new Set(activeEmployees.filter(e => isEligible(e.address)).map(e => e.address))
      setSelectedEmployees(eligible)
    }
  }, [view, activeEmployees, isEligible])

  const adminEnsuredRef = useRef(false)
  const ensureCompanyAdmin = useCallback(async () => {
    if (adminEnsuredRef.current || !appIdStr || !activeAddress) return
    adminEnsuredRef.current = true
    await companyApi.upsert({
      appId: appIdStr,
      name: companyName || 'Company',
      network,
      treasuryAsset: 'USDC',
      adminAddress: activeAddress,
    }).catch(() => {})
  }, [appIdStr, activeAddress, companyName, network])

  const handleCreate = async () => {
    if (!appIdStr || !newRunName.trim()) return
    setCreating(true)
    try {
      await ensureCompanyAdmin()
      const run = await payrollRunApi.create({
        companyAppId: appIdStr,
        name: newRunName.trim(),
      })
      setRuns(prev => [run, ...prev])
      setNewRunName('')
      setSelectedRun(run)
      setView('detail')
    } catch {
      // error handled by api.ts
    } finally {
      setCreating(false)
    }
  }

  const handleProcessPayments = async () => {
    if (!selectedRun || selectedEmployees.size === 0) return
    await executePayroll(selectedRun.id, Array.from(selectedEmployees))
    const updated = await payrollRunApi.get(selectedRun.id).catch(() => null)
    if (updated) {
      setSelectedRun(updated)
      setRuns(prev => prev.map(r => r.id === updated.id ? updated : r))
    }
  }

  const openRun = (run: PayrollRunData) => {
    setSelectedRun(run)
    setView('detail')
  }

  const toggleEmployee = (addr: string) => {
    setSelectedEmployees(prev => {
      const next = new Set(prev)
      if (next.has(addr)) next.delete(addr)
      else next.add(addr)
      return next
    })
  }

  const toggleAll = () => {
    const eligible = activeEmployees.filter(e => isEligible(e.address)).map(e => e.address)
    const allSelected = eligible.every(a => selectedEmployees.has(a))
    if (allSelected) {
      setSelectedEmployees(new Set())
    } else {
      setSelectedEmployees(new Set(eligible))
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'rgba(251,191,36,0.1)', text: '#FBBF24' },
      processing: { bg: 'rgba(96,165,250,0.1)', text: '#60A5FA' },
      completed: { bg: 'rgba(74,222,128,0.1)', text: '#4ADE80' },
      partial: { bg: 'rgba(248,113,113,0.1)', text: '#F87171' },
    }
    const s = styles[status] || styles.pending
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase" style={{ backgroundColor: s.bg, color: s.text }}>
        {status}
      </span>
    )
  }

  const kycBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: 'badge-success',
      submitted: 'badge-info',
      rejected: 'badge-error',
      pending: 'badge-warning',
      draft: 'badge-warning',
    }
    return (
      <span className={`badge badge-xs ${styles[status] || 'badge-ghost'}`}>
        {status}
      </span>
    )
  }

  // ── LIST VIEW ──
  if (view === 'list') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Payroll</h2>

        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-sm font-semibold mb-3">Create Payroll Run</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. May 2026 Salary"
              className="input input-bordered input-sm flex-1"
              value={newRunName}
              onChange={(e) => setNewRunName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              disabled={creating}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newRunName.trim() || !appIdStr}
              className="btn btn-primary btn-sm px-6"
            >
              {creating ? <span className="loading loading-spinner loading-xs" /> : 'Create'}
            </button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="text-sm font-semibold">Payroll Runs</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'rgba(250,250,247,0.4)' }}>{runs.length} run(s)</div>
          </div>

          {runsLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : runs.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs" style={{ color: 'rgba(250,250,247,0.4)' }}>
              No payroll runs yet. Create one above to get started.
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(250,250,247,0.06)' }}>
              {runs.map(run => (
                <button
                  key={run.id}
                  onClick={() => openRun(run)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div>
                    <div className="text-sm font-medium">{run.name || 'Untitled'}</div>
                    <div className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(250,250,247,0.4)' }}>
                      {new Date(run.createdAt).toLocaleString()}
                      {run.status !== 'pending' && ` · ${run.employeesPaid} paid`}
                      {run.employeesFailed > 0 && ` · ${run.employeesFailed} failed`}
                      {run.totalAmount !== '0' && ` · $${microUnitsToUsdc(BigInt(run.totalAmount))}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(run.status)}
                    <span className="text-xs opacity-30">&rarr;</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── DETAIL VIEW ──
  const canProcess = selectedRun?.status === 'pending' && selectedEmployees.size > 0 && hasSufficientFunds && !payrollRunning

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => { setView('list'); setSelectedRun(null) }} className="text-xs opacity-40 hover:opacity-70 transition-opacity">
          &larr; Back
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{selectedRun?.name || 'Payroll Run'}</h2>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(250,250,247,0.4)' }}>
            Created {selectedRun ? new Date(selectedRun.createdAt).toLocaleString() : ''}
            {' · '}
            {statusBadge(selectedRun?.status || 'pending')}
          </div>
        </div>
        <button onClick={fetchPrice} disabled={loadingPrice} className="btn btn-ghost btn-sm text-xs">
          {loadingPrice ? <span className="loading loading-spinner loading-xs" /> : 'Fetch ALGO Price'}
        </button>
      </div>

      {/* Treasury overview */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>USDC Balance</div>
            <div className={`text-lg font-bold font-mono ${!hasSufficientFunds && selectedEmployees.size > 0 ? 'text-error' : ''}`}>${microUnitsToUsdc(usdcBalance)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>ALGO Balance</div>
            <div className="text-lg font-bold font-mono">{(Number(algoBalance) / 1_000_000).toFixed(4)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Selected Total</div>
            <div className="text-lg font-bold font-mono">${microUnitsToUsdc(selectedTotal)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>ALGO/USDC</div>
            <div className="text-lg font-bold font-mono">{algoPrice > 0 ? `$${algoPrice.toFixed(4)}` : '—'}</div>
          </div>
        </div>
        {custody && (
          <div className="mt-3 pt-3 text-[10px] font-mono" style={{ borderTop: '1px solid rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.3)' }}>
            Custody yield offset: +${microUnitsToUsdc(accruedYield)} (effective USDC ${microUnitsToUsdc(effectiveUsdc)})
          </div>
        )}
        {algoPrice > 0 && (
          <div className="mt-3 pt-3 text-[10px] font-mono" style={{ borderTop: '1px solid rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.3)' }}>
            Tinyman {network} &middot; 1 ALGO = ${algoPrice.toFixed(4)} USDC
          </div>
        )}
      </div>

      {/* Payment Breakdown Table with checkboxes */}
      {activeEmployees.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
            <div>
              <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Employees</div>
              <div className="text-sm font-semibold">
                Payment Breakdown
                <span className="font-normal text-xs ml-2" style={{ color: 'rgba(250,250,247,0.4)' }}>
                  ({selectedEmployees.size} selected)
                </span>
              </div>
            </div>
            {selectedRun?.status === 'pending' && (
              <button onClick={toggleAll} className="btn btn-ghost btn-xs">
                {activeEmployees.filter(e => isEligible(e.address)).every(a => selectedEmployees.has(a.address)) ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  {selectedRun?.status === 'pending' && <th className="w-8"></th>}
                  <th>Employee</th>
                  <th>Salary</th>
                  <th>USDC Portion</th>
                  <th>ALGO Portion</th>
                  {algoPrice > 0 && <th>ALGO Amount</th>}
                  <th>KYC</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeEmployees.map(emp => {
                  const meta = employeeMeta[emp.address]
                  const dbMeta = backendMap.get(emp.address)
                  const kycStatus = dbMeta?.kycStatus || 'pending'
                  const eligible = isEligible(emp.address)
                  const usdcPct = emp.usdcPercentage
                  const algoPct = 100 - usdcPct
                  const usdcAmount = Number(emp.salary) * usdcPct / 100
                  const algoUsdcAmount = Number(emp.salary) * algoPct / 100
                  const algoTokens = algoPrice > 0 ? (algoUsdcAmount / 1_000_000) / algoPrice : 0

                  let statusLabel: React.ReactNode
                  if (!emp.optedIntoUsdc) {
                    statusLabel = <span className="badge badge-sm badge-warning">No USDC opt-in</span>
                  } else if (kycStatus !== 'approved') {
                    statusLabel = <span className="badge badge-sm badge-warning">KYC {kycStatus}</span>
                  } else {
                    statusLabel = <span className="badge badge-sm badge-success">Ready</span>
                  }

                  return (
                    <tr key={emp.address} className={!eligible ? 'opacity-50' : ''}>
                      {selectedRun?.status === 'pending' && (
                        <td>
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
                            checked={selectedEmployees.has(emp.address)}
                            disabled={!eligible}
                            onChange={() => toggleEmployee(emp.address)}
                          />
                        </td>
                      )}
                      <td>
                        <div className="text-xs font-medium">{meta?.name || 'Unnamed'}</div>
                        <div className="font-mono text-[10px] opacity-40">{ellipseAddress(emp.address, 6)}</div>
                      </td>
                      <td className="font-mono text-xs">${microUnitsToUsdc(emp.salary)}</td>
                      <td className="font-mono text-xs">${microUnitsToUsdc(BigInt(Math.round(usdcAmount)))} <span className="opacity-40">({usdcPct}%)</span></td>
                      <td className="font-mono text-xs">${microUnitsToUsdc(BigInt(Math.round(algoUsdcAmount)))} <span className="opacity-40">({algoPct}%)</span></td>
                      {algoPrice > 0 && (
                        <td className="font-mono text-xs">{algoTokens > 0 ? `~${algoTokens.toFixed(2)} ALGO` : '—'}</td>
                      )}
                      <td>{kycBadge(kycStatus)}</td>
                      <td>{statusLabel}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warnings */}
      {kycPendingCount > 0 && (
        <div className="p-4 rounded-xl text-xs" style={{ backgroundColor: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: '#FBBF24' }}>
          <span className="font-bold">{kycPendingCount} employee(s)</span> excluded due to pending KYC approval.
        </div>
      )}

      {notOptedIn.length > 0 && (
        <div className="p-4 rounded-xl text-xs" style={{ backgroundColor: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: '#FBBF24' }}>
          <span className="font-bold">{notOptedIn.length} employee(s)</span> have not opted into USDC and will be skipped.
        </div>
      )}

      {!hasSufficientFunds && selectedEmployees.size > 0 && (
        <div className="p-4 rounded-xl text-xs" style={{ backgroundColor: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: '#F87171' }}>
          Insufficient USDC balance to cover payroll. Fund the contract before running.
        </div>
      )}

      {/* Completed summary */}
      {selectedRun && selectedRun.status !== 'pending' && selectedRun.status !== 'processing' && (
        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-sm font-semibold mb-2">Result</div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Total Disbursed</div>
              <div className="font-mono font-bold">${microUnitsToUsdc(BigInt(selectedRun.totalAmount))}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Paid</div>
              <div className="font-mono font-bold text-success">{selectedRun.employeesPaid}</div>
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Failed</div>
              <div className={`font-mono font-bold ${selectedRun.employeesFailed > 0 ? 'text-error' : ''}`}>{selectedRun.employeesFailed}</div>
            </div>
          </div>
        </div>
      )}

      {/* Execute Button */}
      {selectedRun?.status === 'pending' && (
        <div className="rounded-xl p-5 flex items-center justify-between" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div>
            <div className="text-sm font-semibold">Process Payments</div>
            <div className="text-xs mt-1" style={{ color: 'rgba(250,250,247,0.4)' }}>
              {selectedEmployees.size} employee(s) selected &middot; ${microUnitsToUsdc(selectedTotal)} total
              {algoPrice > 0 && ' · Tinyman rate applied'}
            </div>
          </div>
          <button
            onClick={handleProcessPayments}
            disabled={!canProcess}
            className="btn btn-primary btn-sm px-6"
          >
            {payrollRunning ? <span className="loading loading-spinner loading-xs" /> : 'Process Payments'}
          </button>
        </div>
      )}

      {/* Payroll Progress Modal */}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(250,250,247,0.1)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(250,250,247,0.08)' }}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'rgba(250,250,247,0.6)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                <span className="text-sm font-semibold">Processing: {selectedRun?.name}</span>
              </div>
              {!payrollRunning && (
                <button onClick={() => setShowPayrollModal(false)} className="text-xs opacity-40 hover:opacity-70 transition-opacity">Close</button>
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
                      <a href={`${explorerBase}/address/${step.empAddress}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] opacity-30 hover:opacity-60">{ellipseAddress(step.empAddress, 8)} &#8599;</a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!payrollRunning && payrollSteps.length > 0 && (
              <div className="px-6 pb-5">
                <button onClick={() => setShowPayrollModal(false)} className="w-full py-2.5 text-xs font-mono tracking-wider opacity-50 hover:opacity-80 transition-opacity rounded-lg" style={{ border: '1px solid rgba(250,250,247,0.1)' }}>CLOSE</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RunPayroll
