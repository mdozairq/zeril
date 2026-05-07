import { useEffect, useState } from 'react'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePayroll } from '../contexts/PayrollContext'
import { offrampApi, employeeApi, type EmployeeMetaData } from '../services/api'
import { ellipseAddress } from '../utils/ellipseAddress'
import { ArrowRightLeft, RefreshCw, Building2, AlertCircle } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  created: 'badge-ghost',
  bridging: 'badge-warning',
  offramp_pending: 'badge-info',
  completed: 'badge-success',
  failed: 'badge-error',
}

export default function OfframpCompany() {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const { appIdStr, employeeMeta } = usePayroll()

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Awaited<ReturnType<typeof offrampApi.list>>>([])
  const [employees, setEmployees] = useState<EmployeeMetaData[]>([])
  const [selectedEmp, setSelectedEmp] = useState('')
  const [processing, setProcessing] = useState(false)

  const refresh = async () => {
    if (!appIdStr) return
    setLoading(true)
    try {
      const [res, emps] = await Promise.all([
        offrampApi.list({ appId: appIdStr, limit: 100 }),
        employeeApi.list(appIdStr),
      ])
      setRows(res)
      setEmployees(emps.filter(e => e.payoutMethod === 'bank'))
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to load', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appIdStr])

  const handleProcess = async () => {
    if (!selectedEmp || !appIdStr) return
    setProcessing(true)
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const token = localStorage.getItem('zeril_api_token')
      const res = await fetch(`${API_BASE}/api/offramp/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ companyAppId: appIdStr, employeeAddress: selectedEmp }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Process failed')
      enqueueSnackbar('Off-ramp initiated', { variant: 'success' })
      setSelectedEmp('')
      await refresh()
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed', { variant: 'error' })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6" /> Bank Off-ramp
          </h2>
          <p className="text-xs opacity-40">Pipeline status for Wormhole + Saber bank transfers.</p>
        </div>
        <button className="btn btn-ghost btn-sm gap-1" onClick={refresh} disabled={loading}>
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Initiate off-ramp for a bank-payout employee */}
      {employees.length > 0 && (
        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 opacity-50" />
            <span className="text-sm font-semibold">Initiate Bank Transfer</span>
          </div>
          <div className="flex gap-2">
            <select
              className="select select-bordered select-sm flex-1"
              value={selectedEmp}
              onChange={e => setSelectedEmp(e.target.value)}
              disabled={processing}
            >
              <option value="">Select employee...</option>
              {employees.map(emp => (
                <option key={emp.walletAddress} value={emp.walletAddress}>
                  {emp.name} ({ellipseAddress(emp.walletAddress, 6)}) — {emp.country || 'No country'}
                </option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleProcess}
              disabled={!selectedEmp || processing}
            >
              {processing ? <span className="loading loading-spinner loading-xs" /> : 'Process'}
            </button>
          </div>
          <div className="text-[10px] opacity-40 mt-2">
            Uses the employee's saved bank details. Sandbox mode: simulated bridge + off-ramp.
          </div>
        </div>
      )}

      {employees.length === 0 && !loading && (
        <div className="alert text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>No employees have set up bank transfer payout. They need to switch to "Bank Transfer" in their payout preferences.</span>
        </div>
      )}

      {/* Requests table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
          <h3 className="text-sm font-semibold">Requests ({rows.length})</h3>
        </div>
        <div className="p-4 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="text-sm opacity-40 p-4">No off-ramp requests yet.</div>
          ) : (
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="text-[10px] font-mono">Employee</th>
                  <th className="text-[10px] font-mono">Amount (USDC)</th>
                  <th className="text-[10px] font-mono">Status</th>
                  <th className="text-[10px] font-mono">Bridge Ref</th>
                  <th className="text-[10px] font-mono">Offramp Ref</th>
                  <th className="text-[10px] font-mono">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const empName = employeeMeta[r.employeeWalletAddress]?.name
                  return (
                    <tr key={r.id}>
                      <td className="text-xs">
                        <div className="font-semibold">{empName || ellipseAddress(r.employeeWalletAddress, 6)}</div>
                        <div className="font-mono text-[10px] opacity-40">{ellipseAddress(r.employeeWalletAddress, 8)}</div>
                      </td>
                      <td className="font-mono text-xs">${(parseInt(r.amountUsdcMicrounits) / 1_000_000).toFixed(2)}</td>
                      <td><span className={`badge badge-xs ${STATUS_COLORS[r.status] || 'badge-ghost'}`}>{r.status}</span></td>
                      <td className="text-[10px] opacity-50 font-mono">{r.bridgeRef ?? '—'}</td>
                      <td className="text-[10px] opacity-50 font-mono">{r.offrampRef ?? '—'}</td>
                      <td className="text-[10px] opacity-40">{new Date(r.createdAt).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {activeAddress && (
        <div className="text-[10px] opacity-30">
          Sandbox mode: provider calls simulate bridge + off-ramp references unless WORMHOLE_SANDBOX_URL / SABER_SANDBOX_URL are configured.
        </div>
      )}
    </div>
  )
}
