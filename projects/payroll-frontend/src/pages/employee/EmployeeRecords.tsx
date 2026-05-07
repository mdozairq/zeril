import { useState, useEffect, useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useEmployee } from '../../contexts/EmployeeContext'
import { microUnitsToUsdc } from '../../utils/formatUsdc'
import { paymentApi, type PayslipData } from '../../services/api'
import { FileText, X } from 'lucide-react'

function PayslipModal({ payslip, explorerBase, onClose }: { payslip: PayslipData; explorerBase: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(250,250,247,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.08)' }}>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 opacity-60" />
            <h3 className="font-semibold">Payslip</h3>
          </div>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Company header */}
          <div className="text-center" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)', paddingBottom: '16px' }}>
            <div className="text-lg font-bold">{payslip.company.name}</div>
            <div className="text-[10px] font-mono opacity-40">App ID: {payslip.company.appId} · {payslip.company.network}</div>
          </div>

          {/* Payroll run info */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="opacity-40">Payroll Run</span>
              <div className="font-semibold">{payslip.payrollRunName || 'Unnamed'}</div>
            </div>
            <div className="text-right">
              <span className="opacity-40">Date</span>
              <div className="font-semibold">{new Date(payslip.runDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
          </div>

          {/* Employee info */}
          <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-2 opacity-40">Employee</div>
            <div className="text-sm font-semibold">{payslip.employee.name}</div>
            <div className="text-[10px] font-mono opacity-40 mt-1 break-all">{payslip.employee.walletAddress}</div>
            {payslip.employee.country && (
              <div className="mt-1"><span className="badge badge-ghost badge-xs">{payslip.employee.country}</span></div>
            )}
          </div>

          {/* Amounts breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Gross Salary</span>
              <span className="font-mono font-bold">${parseFloat(payslip.grossAmount).toFixed(2)}</span>
            </div>
            <div className="divider my-0" style={{ borderColor: 'rgba(250,250,247,0.06)' }} />

            <div className="text-[10px] font-mono tracking-wider uppercase opacity-40 mt-2">Tax Breakdown</div>
            <div className="flex justify-between text-xs">
              <span className="opacity-60">TDS / Withholding</span>
              <span className="font-mono text-error">-${parseFloat(payslip.breakdown.tds).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="opacity-60">Social Security</span>
              <span className="font-mono text-error">-${parseFloat(payslip.breakdown.socialSecurity).toFixed(2)}</span>
            </div>
            {parseFloat(payslip.breakdown.surcharge) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="opacity-60">Surcharge</span>
                <span className="font-mono text-error">-${parseFloat(payslip.breakdown.surcharge).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="opacity-60">Effective Tax Rate</span>
              <span className="font-mono">{(parseFloat(payslip.breakdown.effectiveRate) * 100).toFixed(2)}%</span>
            </div>

            <div className="divider my-0" style={{ borderColor: 'rgba(250,250,247,0.06)' }} />
            <div className="flex justify-between text-xs">
              <span className="opacity-60">Total Tax Withheld</span>
              <span className="font-mono font-bold text-error">-${parseFloat(payslip.taxWithheld).toFixed(2)}</span>
            </div>

            <div className="divider my-0" style={{ borderColor: 'rgba(250,250,247,0.06)' }} />
            <div className="flex justify-between text-sm font-bold">
              <span>Net Pay</span>
              <span className="font-mono text-success">${parseFloat(payslip.netAmount).toFixed(2)}</span>
            </div>
          </div>

          {/* Transaction */}
          {payslip.txHash && (
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
              <div className="text-[10px] font-mono tracking-wider uppercase mb-1 opacity-40">Transaction</div>
              <a
                href={`${explorerBase}/tx/${payslip.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs link link-primary break-all"
              >
                {payslip.txHash} ↗
              </a>
            </div>
          )}

          <div className="flex justify-between items-center text-xs opacity-40">
            <span>Status: <span className={`badge badge-xs ${payslip.status === 'completed' ? 'badge-success' : 'badge-ghost'}`}>{payslip.status}</span></span>
            <span className="font-mono">ID: {payslip.paymentId.slice(0, 8)}...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeRecords() {
  const { paymentHistory, loadingHistory, lastPaidRound, explorerBase, appId } = useEmployee()
  const [payslips, setPayslips] = useState<PayslipData[]>([])
  const [loadingPayslips, setLoadingPayslips] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(null)
  const [view, setView] = useState<'onchain' | 'payslips'>('onchain')

  const { activeAddress } = useWallet()

  const appIdStr = useMemo(() => appId?.toString() ?? '', [appId])

  useEffect(() => {
    if (!activeAddress || !appIdStr) return
    setLoadingPayslips(true)
    paymentApi.employeePayslips(activeAddress, appIdStr)
      .then(setPayslips)
      .catch(() => setPayslips([]))
      .finally(() => setLoadingPayslips(false))
  }, [activeAddress, appIdStr])

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex gap-2">
        <button
          className={`btn btn-sm ${view === 'onchain' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setView('onchain')}
        >
          On-chain Records
        </button>
        <button
          className={`btn btn-sm ${view === 'payslips' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setView('payslips')}
        >
          Payslips ({payslips.length})
        </button>
      </div>

      {view === 'payslips' ? (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Off-chain</div>
            <div className="text-sm font-semibold">Payslips</div>
          </div>

          {loadingPayslips ? (
            <div className="p-8 flex justify-center">
              <span className="loading loading-spinner loading-sm opacity-40" />
            </div>
          ) : payslips.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
                    <th className="text-left px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Date</th>
                    <th className="text-left px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Payroll Run</th>
                    <th className="text-right px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Gross</th>
                    <th className="text-right px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Tax</th>
                    <th className="text-right px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Net</th>
                    <th className="text-center px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map(ps => (
                    <tr key={ps.paymentId} style={{ borderBottom: '1px solid rgba(250,250,247,0.04)' }}>
                      <td className="px-5 py-3 text-xs font-mono">
                        {new Date(ps.runDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-5 py-3 text-xs">{ps.payrollRunName || '—'}</td>
                      <td className="px-5 py-3 text-right font-mono text-xs">${parseFloat(ps.grossAmount).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-error">-${parseFloat(ps.taxWithheld).toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-mono text-xs font-bold text-success">${parseFloat(ps.netAmount).toFixed(2)}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`badge badge-xs ${ps.status === 'completed' ? 'badge-success' : ps.status === 'pending' ? 'badge-warning' : 'badge-ghost'}`}>
                          {ps.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button className="btn btn-ghost btn-xs gap-1" onClick={() => setSelectedPayslip(ps)}>
                          <FileText className="w-3 h-3" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-sm opacity-40">No payslips available yet.</div>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>On-chain</div>
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
      )}

      {selectedPayslip && (
        <PayslipModal
          payslip={selectedPayslip}
          explorerBase={explorerBase}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </div>
  )
}
