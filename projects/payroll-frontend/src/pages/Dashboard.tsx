import { usePayroll } from '../contexts/PayrollContext'
import { microUnitsToUsdc, formatUsdcDisplay } from '../utils/formatUsdc'
import { ellipseAddress } from '../utils/ellipseAddress'

const Dashboard = () => {
  const {
    appId, appAddress, usdcAssetId, usdcBalance, algoBalance,
    employees, activeEmployees, totalPayroll, network, explorerBase,
    companyName, employerAddress,
  } = usePayroll()

  const activeCount = activeEmployees.length

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Treasury Wallet Card */}
      <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-mono tracking-widest uppercase" style={{ color: 'rgba(250,250,247,0.4)' }}>
              Treasury Wallet · {network} · {companyName || 'Zeril Payroll'}
            </div>
          </div>
          <a
            href={`${explorerBase}/address/${appAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono opacity-40 hover:opacity-70 transition-opacity"
          >
            {ellipseAddress(appAddress ?? '', 8)} ↗
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(250,250,247,0.04)', border: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>USDC Balance</div>
            <div className="text-2xl font-bold font-mono">${microUnitsToUsdc(usdcBalance)}</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(250,250,247,0.04)', border: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>ALGO Balance</div>
            <div className="text-2xl font-bold font-mono">{(Number(algoBalance) / 1_000_000).toFixed(4)}</div>
          </div>
        </div>

        {usdcBalance < totalPayroll && activeCount > 0 && (
          <div className="mt-4 p-3 rounded-lg text-xs flex items-center gap-2" style={{ backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#FBBF24' }}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
            Insufficient USDC — contract needs ${microUnitsToUsdc(totalPayroll - usdcBalance)} more to cover payroll.
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>Active Employees</div>
          <div className="text-3xl font-bold">{activeCount}</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(250,250,247,0.3)' }}>{employees.length} total registered</div>
        </div>
        <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>Monthly Payroll</div>
          <div className="text-3xl font-bold">{formatUsdcDisplay(totalPayroll)}</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(250,250,247,0.3)' }}>across {activeCount} employees</div>
        </div>
        <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>Months Covered</div>
          <div className="text-3xl font-bold">
            {totalPayroll > 0n ? Math.floor(Number(usdcBalance) / Number(totalPayroll)) : '—'}
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(250,250,247,0.3)' }}>at current balance</div>
        </div>
      </div>

      {/* Contract Info + Allocation Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <h3 className="text-sm font-semibold mb-3">Contract Details</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span style={{ color: 'rgba(250,250,247,0.4)' }}>App ID</span>
              <a href={`${explorerBase}/application/${appId}`} target="_blank" rel="noopener noreferrer" className="font-mono hover:opacity-70">
                {appId?.toString()} ↗
              </a>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'rgba(250,250,247,0.4)' }}>USDC Asset</span>
              <span className="font-mono">{usdcAssetId.toString()}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'rgba(250,250,247,0.4)' }}>Network</span>
              <span className="capitalize">{network}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'rgba(250,250,247,0.4)' }}>Employer</span>
              <span className="font-mono">{ellipseAddress(employerAddress ?? '', 8)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <h3 className="text-sm font-semibold mb-3">Allocation Overview</h3>
          {activeEmployees.length > 0 ? (
            <div className="space-y-2">
              {activeEmployees.slice(0, 5).map(emp => {
                const algoPct = 100 - emp.usdcPercentage
                return (
                  <div key={emp.address} className="flex items-center gap-3">
                    <span className="font-mono text-xs w-20 truncate" style={{ color: 'rgba(250,250,247,0.5)' }}>{ellipseAddress(emp.address, 4)}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.06)' }}>
                      <div className="h-full rounded-full flex">
                        {emp.usdcPercentage > 0 && (
                          <div className="h-full" style={{ width: `${emp.usdcPercentage}%`, backgroundColor: 'rgba(74,222,128,0.6)' }} />
                        )}
                        {algoPct > 0 && (
                          <div className="h-full" style={{ width: `${algoPct}%`, backgroundColor: 'rgba(250,250,247,0.3)' }} />
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] w-20 text-right" style={{ color: 'rgba(250,250,247,0.4)' }}>
                      {emp.usdcPercentage}% / {algoPct}%
                    </span>
                  </div>
                )
              })}
              {activeEmployees.length > 5 && (
                <div className="text-xs opacity-30">+{activeEmployees.length - 5} more</div>
              )}
              <div className="flex items-center gap-4 mt-2 pt-2 text-[10px]" style={{ borderTop: '1px solid rgba(250,250,247,0.06)' }}>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'rgba(74,222,128,0.6)' }} /> USDC</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'rgba(250,250,247,0.3)' }} /> ALGO</span>
              </div>
            </div>
          ) : (
            <p className="text-xs opacity-30 py-4">No active employees yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
