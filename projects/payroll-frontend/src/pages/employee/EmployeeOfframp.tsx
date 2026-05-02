import { useEffect, useState } from 'react'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { useEmployee } from '../../contexts/EmployeeContext'
import { offrampApi } from '../../services/api'

export default function EmployeeOfframp() {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const employee = useEmployee()
  const appIdStr = employee.appId?.toString() ?? ''

  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Awaited<ReturnType<typeof offrampApi.list>>>([])

  const refresh = async () => {
    if (!activeAddress) return
    setLoading(true)
    try {
      const res = await offrampApi.list({ address: activeAddress, limit: 50 })
      setRows(res)
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to load', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress])

  const create = async () => {
    if (!activeAddress || !appIdStr) return
    setLoading(true)
    try {
      await offrampApi.create({
        companyAppId: appIdStr,
        employeeWalletAddress: activeAddress,
        amountUsdcMicrounits: amount.trim(),
      })
      enqueueSnackbar('Off-ramp request created', { variant: 'success' })
      setAmount('')
      await refresh()
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to create', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bank Off-ramp</h2>
          <p className="text-xs opacity-50">Sandbox requests for converting USDC to bank transfer.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
        </button>
      </div>

      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="text-xs font-semibold mb-2">Create request</div>
        <div className="flex gap-2">
          <input
            className="input input-bordered input-sm flex-1 font-mono"
            placeholder="Amount (USDC micro-units)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
          />
          <button className="btn btn-primary btn-sm" onClick={create} disabled={loading || !amount.trim() || !appIdStr}>
            Create
          </button>
        </div>
        <div className="text-[10px] opacity-40 mt-2">
          For sandbox only; this does not move funds on-chain yet.
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-xs font-semibold">History</div>
        </div>
        <div className="p-4 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="text-sm opacity-40">No requests yet.</div>
          ) : (
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Amount (micro)</th>
                  <th>Status</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{r.amountUsdcMicrounits}</td>
                    <td><span className="badge badge-xs">{r.status}</span></td>
                    <td className="text-xs opacity-50">{r.lastError ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

