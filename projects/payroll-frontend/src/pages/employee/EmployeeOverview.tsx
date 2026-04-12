import { useWallet } from '@txnlab/use-wallet-react'
import { useEmployee } from '../../contexts/EmployeeContext'
import { ellipseAddress } from '../../utils/ellipseAddress'
import { formatUsdcDisplay, microUnitsToUsdc } from '../../utils/formatUsdc'

export default function EmployeeOverview() {
  const { activeAddress } = useWallet()
  const {
    salary, isActive, optedIntoUsdc, lastPaidRound,
    appId, appAddress, companyMeta,
    explorerBase, allocation, algoPrice, loadingPrice, fetchPrice, network,
  } = useEmployee()

  return (
    <div className="space-y-6">
      {/* Wallet Card */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>
            Your Wallet · {companyMeta?.name || 'Payroll'}
          </div>
          <a
            href={`${explorerBase}/address/${activeAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono opacity-30 hover:opacity-60"
          >
            View on Explorer ↗
          </a>
        </div>
        <div className="font-mono text-xs break-all" style={{ color: 'rgba(250,250,247,0.5)' }}>{activeAddress}</div>
      </div>

      {/* Salary & Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>Monthly Salary</div>
          <div className="text-2xl font-bold">{formatUsdcDisplay(salary)}</div>
        </div>
        <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>Status</div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-success' : 'bg-error'}`} />
            <span className="text-sm font-medium">{isActive ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>USDC Opt-in</div>
          <span className={`badge badge-sm ${optedIntoUsdc ? 'badge-success' : 'badge-warning'}`}>
            {optedIntoUsdc ? 'Opted In' : 'Not Opted In'}
          </span>
        </div>
      </div>

      {/* Contract Details */}
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
            <span style={{ color: 'rgba(250,250,247,0.4)' }}>Contract Address</span>
            <span className="font-mono">{ellipseAddress(appAddress ?? '', 10)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'rgba(250,250,247,0.4)' }}>Last Paid</span>
            <span className="font-mono">{lastPaidRound > 0n ? `Round ${lastPaidRound}` : 'Never'}</span>
          </div>
          {companyMeta && (
            <div className="flex justify-between">
              <span style={{ color: 'rgba(250,250,247,0.4)' }}>Company</span>
              <span>{companyMeta.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Allocation Preview */}
      {allocation && allocation.allocations.length > 0 && (
        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Payout Splits</div>
              <h3 className="text-sm font-semibold">Your Allocation</h3>
            </div>
            <button onClick={fetchPrice} disabled={loadingPrice} className="btn btn-ghost btn-xs text-xs">
              {loadingPrice ? <span className="loading loading-spinner loading-xs" /> : 'Fetch Prices'}
            </button>
          </div>
          <div className="space-y-3">
            {allocation.allocations.map((a, i) => {
              const isUsdc = a.token === 'USDC'
              const dollarValue = isUsdc
                ? microUnitsToUsdc(BigInt(Math.round(Number(salary) * a.percentage / 100)))
                : algoPrice > 0
                  ? (Number(salary) / 1_000_000 * a.percentage / 100 / algoPrice).toFixed(2)
                  : null
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          backgroundColor: isUsdc ? 'rgba(74,222,128,0.15)' : 'rgba(250,250,247,0.08)',
                          color: isUsdc ? '#4ADE80' : '#FAFAF7',
                        }}>
                        {isUsdc ? '$' : 'A'}
                      </div>
                      <div>
                        <span className="font-mono text-sm">{a.token}</span>
                        <span className="text-xs opacity-40 ml-2">{a.percentage}%</span>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold">
                      {isUsdc ? `$${dollarValue}` : dollarValue ? `~${dollarValue} ALGO` : '—'}
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${a.percentage}%`,
                        backgroundColor: isUsdc ? 'rgba(74,222,128,0.5)' : 'rgba(250,250,247,0.3)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {algoPrice > 0 && (
            <div className="mt-4 pt-3 text-[10px] font-mono" style={{ borderTop: '1px solid rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.3)' }}>
              ALGO/USDC: ${algoPrice.toFixed(4)} (Tinyman {network})
            </div>
          )}
        </div>
      )}
    </div>
  )
}
