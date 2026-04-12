import { useEmployee } from '../../contexts/EmployeeContext'
import { microUnitsToUsdc } from '../../utils/formatUsdc'

export default function EmployeeRecords() {
  const { paymentHistory, loadingHistory, lastPaidRound, explorerBase } = useEmployee()

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>History</div>
          <div className="text-sm font-semibold">Payment Records</div>
        </div>

        {loadingHistory ? (
          <div className="p-8 flex justify-center">
            <span className="loading loading-spinner loading-sm opacity-40" />
          </div>
        ) : paymentHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
                  <th className="text-left px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Date</th>
                  <th className="text-left px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Type</th>
                  <th className="text-right px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Amount</th>
                  <th className="text-right px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Round</th>
                  <th className="text-right px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Tx</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map(record => (
                  <tr key={record.id} style={{ borderBottom: '1px solid rgba(250,250,247,0.04)' }}>
                    <td className="px-5 py-3 text-xs font-mono">
                      {new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${record.type === 'usdc' ? 'text-success' : ''}`}
                        style={record.type === 'usdc'
                          ? { backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }
                          : { backgroundColor: 'rgba(250,250,247,0.06)', border: '1px solid rgba(250,250,247,0.1)' }
                        }>
                        {record.type === 'usdc' ? 'USDC' : 'ALGO'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs font-bold">
                      {record.type === 'usdc'
                        ? `$${microUnitsToUsdc(record.amount)}`
                        : `${(Number(record.amount) / 1_000_000).toFixed(4)} ALGO`
                      }
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-xs opacity-40">
                      {record.round}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <a
                        href={`${explorerBase}/tx/${record.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] opacity-40 hover:opacity-70 transition-opacity"
                      >
                        {record.id.slice(0, 8)}... ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm opacity-40">
              {lastPaidRound > 0n
                ? 'No recent payment records found from this contract.'
                : 'No payroll payments received yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
