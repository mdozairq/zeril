import { useEffect, useMemo, useState } from 'react'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { useEmployee } from '../../contexts/EmployeeContext'
import { leaveApi } from '../../services/api'

export default function EmployeeLeave() {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const employee = useEmployee()
  const appIdStr = employee.appId?.toString() ?? ''

  const fy = useMemo(() => String(new Date().getFullYear()), [])
  const [types, setTypes] = useState<Awaited<ReturnType<typeof leaveApi.listTypes>>>([])
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof leaveApi.listRequests>>>([])
  const [balance, setBalance] = useState<{ allocated: number; used: number; remaining: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const [leaveTypeKey, setLeaveTypeKey] = useState('annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [days, setDays] = useState(1)
  const [note, setNote] = useState('')

  const refresh = async () => {
    if (!appIdStr || !activeAddress) return
    setLoading(true)
    try {
      const [t, r, b] = await Promise.all([
        leaveApi.listTypes(appIdStr),
        leaveApi.listRequests({ appId: appIdStr, address: activeAddress }),
        leaveApi.balance(appIdStr, activeAddress, fy),
      ])
      setTypes(t)
      setRequests(r)
      setBalance({ allocated: b.allocated, used: b.used, remaining: b.remaining })
      if (t.length > 0 && !t.find((x) => x.key === leaveTypeKey)) {
        setLeaveTypeKey(t[0].key)
      }
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to load leave', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appIdStr, activeAddress])

  const submit = async () => {
    if (!appIdStr || !activeAddress) return
    setLoading(true)
    try {
      await leaveApi.createRequest({
        companyAppId: appIdStr,
        walletAddress: activeAddress,
        leaveTypeKey,
        startDate,
        endDate,
        days,
        note: note || undefined,
      })
      enqueueSnackbar('Leave request submitted', { variant: 'success' })
      setStartDate('')
      setEndDate('')
      setDays(1)
      setNote('')
      await refresh()
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to submit', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Leave</h2>
          <p className="text-xs opacity-50">Request time off and track approvals.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
        </button>
      </div>

      {balance && (
        <div className="stats shadow w-full">
          <div className="stat">
            <div className="stat-title">Allocated ({fy})</div>
            <div className="stat-value text-lg">{balance.allocated}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Used</div>
            <div className="stat-value text-lg">{balance.used}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Remaining</div>
            <div className="stat-value text-lg">{balance.remaining}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="text-xs font-semibold">New request</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="form-control">
            <span className="label-text text-xs opacity-60">Leave type</span>
            <select className="select select-bordered select-sm" value={leaveTypeKey} onChange={(e) => setLeaveTypeKey(e.target.value)} disabled={loading}>
              {types.length === 0 ? (
                <option value="annual">annual</option>
              ) : (
                types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)
              )}
            </select>
          </label>
          <label className="form-control">
            <span className="label-text text-xs opacity-60">Days</span>
            <input className="input input-bordered input-sm" type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} disabled={loading} />
          </label>
          <label className="form-control">
            <span className="label-text text-xs opacity-60">Start date</span>
            <input className="input input-bordered input-sm" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={loading} />
          </label>
          <label className="form-control">
            <span className="label-text text-xs opacity-60">End date</span>
            <input className="input input-bordered input-sm" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={loading} />
          </label>
        </div>
        <textarea className="textarea textarea-bordered textarea-sm w-full" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} disabled={loading} />
        <div className="flex justify-end">
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading || !startDate || !endDate}>
            Submit request
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-xs font-semibold">History</div>
        </div>
        <div className="p-4 overflow-x-auto">
          {requests.length === 0 ? (
            <div className="text-sm opacity-40">No requests yet.</div>
          ) : (
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="text-xs">{r.leaveTypeKey}</td>
                    <td className="text-xs">{r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)}</td>
                    <td className="text-xs">{r.days}</td>
                    <td><span className="badge badge-xs">{r.status}</span></td>
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

