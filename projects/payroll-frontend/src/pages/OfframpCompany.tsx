import { useEffect, useState } from 'react'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePayroll } from '../contexts/PayrollContext'
import { offrampApi } from '../services/api'

export default function OfframpCompany() {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const { appIdStr } = usePayroll()

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Awaited<ReturnType<typeof offrampApi.list>>>([])

  const refresh = async () => {
    if (!appIdStr) return
    setLoading(true)
    try {
      const res = await offrampApi.list({ appId: appIdStr, limit: 100 })
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
  }, [appIdStr])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bank Off-ramp</h2>
          <p className="text-xs opacity-40">Sandbox pipeline status (Wormhole + Saber).</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
          <h3 className="text-sm font-semibold">Requests</h3>
        </div>
        <div className="p-4 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="text-sm opacity-40">No off-ramp requests yet.</div>
          ) : (
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Amount (micro)</th>
                  <th>Status</th>
                  <th>Bridge</th>
                  <th>Offramp</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{r.employeeWalletAddress}</td>
                    <td className="font-mono text-xs">{r.amountUsdcMicrounits}</td>
                    <td><span className="badge badge-xs">{r.status}</span></td>
                    <td className="text-xs opacity-50">{r.bridgeRef ?? '-'}</td>
                    <td className="text-xs opacity-50">{r.offrampRef ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {activeAddress && (
        <div className="text-[10px] opacity-40">
          Note: In sandbox mode, provider calls are executed if `WORMHOLE_SANDBOX_URL` / `SABER_SANDBOX_URL` are set; otherwise they simulate refs.
        </div>
      )}
    </div>
  )
}

