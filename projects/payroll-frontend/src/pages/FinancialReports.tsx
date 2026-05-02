import { useEffect, useMemo, useState } from 'react'
import { useSnackbar } from 'notistack'
import { usePayroll } from '../contexts/PayrollContext'
import { reportingApi } from '../services/api'
import { microUnitsToUsdc } from '../utils/formatUsdc'

function downloadCsv(filename: string, rows: Record<string, string>[]) {
  const headers = Object.keys(rows[0] ?? {})
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function FinancialReports() {
  const { enqueueSnackbar } = useSnackbar()
  const { appIdStr } = usePayroll()
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [report, setReport] = useState<Awaited<ReturnType<typeof reportingApi.payrollReport>> | null>(null)

  const refresh = async () => {
    if (!appIdStr) return
    setLoading(true)
    try {
      const res = await reportingApi.payrollReport({ appId: appIdStr, from: from || undefined, to: to || undefined })
      setReport(res)
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to load report', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appIdStr])

  const totals = useMemo(() => {
    if (!report) return null
    return {
      gross: BigInt(report.totals.grossUsdcMicrounits),
      fee: BigInt(report.totals.feeUsdcMicrounits),
      tax: BigInt(report.totals.taxUsdcMicrounits),
      other: BigInt(report.totals.otherUsdcMicrounits),
    }
  }, [report])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Reports</h2>
          <p className="text-xs opacity-40">Payroll runs + expense events (CSV export supported).</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
        </button>
      </div>

      <div className="rounded-xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
          <label className="form-control">
            <span className="label-text text-xs opacity-60">From (ISO)</span>
            <input className="input input-bordered input-sm font-mono" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2026-01-01T00:00:00Z" />
          </label>
          <label className="form-control">
            <span className="label-text text-xs opacity-60">To (ISO)</span>
            <input className="input input-bordered input-sm font-mono" value={to} onChange={(e) => setTo(e.target.value)} placeholder="2026-12-31T23:59:59Z" />
          </label>
          <button className="btn btn-primary btn-sm" onClick={refresh} disabled={loading}>
            Apply range
          </button>
        </div>

        {report && (
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const rows = report.runs.map((r) => ({
                  id: r.id,
                  createdAt: r.createdAt,
                  totalAmount: r.totalAmount,
                  employeesPaid: String(r.employeesPaid),
                  employeesFailed: String(r.employeesFailed),
                  status: r.status,
                }))
                downloadCsv(`payroll-runs-${appIdStr}.csv`, rows)
              }}
            >
              Export payroll runs CSV
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const rows = report.expenses.map((e) => ({
                  id: e.id,
                  createdAt: e.createdAt,
                  type: e.type,
                  amountUsdcMicrounits: e.amountUsdcMicrounits,
                  note: e.note ?? '',
                }))
                downloadCsv(`expenses-${appIdStr}.csv`, rows)
              }}
            >
              Export expenses CSV
            </button>
          </div>
        )}
      </div>

      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="text-[10px] opacity-40 uppercase tracking-wider">Gross</div>
            <div className="text-2xl font-bold font-mono">${microUnitsToUsdc(totals.gross)}</div>
          </div>
          <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="text-[10px] opacity-40 uppercase tracking-wider">Fees</div>
            <div className="text-2xl font-bold font-mono">${microUnitsToUsdc(totals.fee)}</div>
          </div>
          <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="text-[10px] opacity-40 uppercase tracking-wider">Tax</div>
            <div className="text-2xl font-bold font-mono">${microUnitsToUsdc(totals.tax)}</div>
          </div>
          <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="text-[10px] opacity-40 uppercase tracking-wider">Other</div>
            <div className="text-2xl font-bold font-mono">${microUnitsToUsdc(totals.other)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

