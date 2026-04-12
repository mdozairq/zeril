import { usePayroll } from '../contexts/PayrollContext'
import { microUnitsToUsdc } from '../utils/formatUsdc'
import { ellipseAddress } from '../utils/ellipseAddress'

const RunPayroll = () => {
  const {
    activeEmployees, payableEmployees, totalPayroll, employeeMeta,
    usdcBalance, algoBalance, algoPrice, loadingPrice, fetchPrice,
    network, explorerBase,
    payrollRunning, payrollSteps, showPayrollModal, setShowPayrollModal,
    executePayroll,
  } = usePayroll()

  const notOptedIn = activeEmployees.filter(e => !e.optedIntoUsdc)
  const hasSufficientFunds = usdcBalance >= totalPayroll

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Run Payroll</h2>
        <button onClick={fetchPrice} disabled={loadingPrice} className="btn btn-ghost btn-sm text-xs">
          {loadingPrice ? <span className="loading loading-spinner loading-xs" /> : 'Fetch ALGO Price'}
        </button>
      </div>

      {/* Treasury overview */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>USDC Balance</div>
            <div className={`text-lg font-bold font-mono ${!hasSufficientFunds && payableEmployees.length > 0 ? 'text-error' : ''}`}>${microUnitsToUsdc(usdcBalance)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>ALGO Balance</div>
            <div className="text-lg font-bold font-mono">{(Number(algoBalance) / 1_000_000).toFixed(4)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Total Payroll</div>
            <div className="text-lg font-bold font-mono">${microUnitsToUsdc(totalPayroll)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>ALGO/USDC</div>
            <div className="text-lg font-bold font-mono">{algoPrice > 0 ? `$${algoPrice.toFixed(4)}` : '—'}</div>
          </div>
        </div>
        {algoPrice > 0 && (
          <div className="mt-3 pt-3 text-[10px] font-mono" style={{ borderTop: '1px solid rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.3)' }}>
            Tinyman {network} · 1 ALGO = ${algoPrice.toFixed(4)} USDC
          </div>
        )}
      </div>

      {/* Allocation Breakdown Table */}
      {activeEmployees.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Payroll</div>
            <div className="text-sm font-semibold">Breakdown by Allocation</div>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Salary</th>
                  <th>USDC Portion</th>
                  <th>ALGO Portion</th>
                  {algoPrice > 0 && <th>ALGO Amount</th>}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeEmployees.map(emp => {
                  const meta = employeeMeta[emp.address]
                  const usdcPct = emp.usdcPercentage
                  const algoPct = 100 - usdcPct
                  const usdcAmount = Number(emp.salary) * usdcPct / 100
                  const algoUsdcAmount = Number(emp.salary) * algoPct / 100
                  const algoTokens = algoPrice > 0 ? (algoUsdcAmount / 1_000_000) / algoPrice : 0

                  return (
                    <tr key={emp.address}>
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
                      <td>
                        {emp.optedIntoUsdc ? (
                          <span className="badge badge-sm badge-success">Ready</span>
                        ) : (
                          <span className="badge badge-sm badge-warning">No USDC opt-in</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warnings */}
      {notOptedIn.length > 0 && (
        <div className="p-4 rounded-xl text-xs" style={{ backgroundColor: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', color: '#FBBF24' }}>
          <span className="font-bold">{notOptedIn.length} employee(s)</span> have not opted into USDC and will be skipped.
        </div>
      )}

      {!hasSufficientFunds && payableEmployees.length > 0 && (
        <div className="p-4 rounded-xl text-xs" style={{ backgroundColor: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', color: '#F87171' }}>
          Insufficient USDC balance to cover payroll. Fund the contract before running.
        </div>
      )}

      {/* Execute Button */}
      <div className="rounded-xl p-5 flex items-center justify-between" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div>
          <div className="text-sm font-semibold">Execute Payroll</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(250,250,247,0.4)' }}>
            {payableEmployees.length} employee(s) · ${microUnitsToUsdc(totalPayroll)} total
            {algoPrice > 0 && ' · Tinyman rate applied'}
          </div>
        </div>
        <button
          onClick={executePayroll}
          disabled={payrollRunning || payableEmployees.length === 0 || !hasSufficientFunds}
          className="btn btn-primary btn-sm px-6"
        >
          {payrollRunning ? <span className="loading loading-spinner loading-xs" /> : 'Run Payroll'}
        </button>
      </div>

      {/* Payroll Progress Modal */}
      {showPayrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ backgroundColor: '#0A0A0A', border: '1px solid rgba(250,250,247,0.1)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(250,250,247,0.08)' }}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'rgba(250,250,247,0.6)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                <span className="text-sm font-semibold">Payroll Execution</span>
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
                      <a href={`${explorerBase}/address/${step.empAddress}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] opacity-30 hover:opacity-60">{ellipseAddress(step.empAddress, 8)} ↗</a>
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
