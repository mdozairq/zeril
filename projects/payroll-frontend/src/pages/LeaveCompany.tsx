import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePayroll } from '../contexts/PayrollContext'
import { leaveApi, companyApi } from '../services/api'
import { ellipseAddress } from '../utils/ellipseAddress'

export default function LeaveCompany() {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const { appIdStr, employeeMeta, companyName, network } = usePayroll()

  const adminEnsuredRef = useRef(false)
  const ensureCompanyAdmin = useCallback(async () => {
    if (adminEnsuredRef.current || !appIdStr || !activeAddress) return
    adminEnsuredRef.current = true
    await companyApi.upsert({ appId: appIdStr, name: companyName || 'Company', network, treasuryAsset: 'USDC', adminAddress: activeAddress }).catch(() => {})
  }, [appIdStr, activeAddress, companyName, network])

  const fy = useMemo(() => String(new Date().getFullYear()), [])
  const [loading, setLoading] = useState(false)
  const [types, setTypes] = useState<Awaited<ReturnType<typeof leaveApi.listTypes>>>([])
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof leaveApi.listRequests>>>([])

  const [newKey, setNewKey] = useState('annual')
  const [newName, setNewName] = useState('Annual Leave')

  const refresh = async () => {
    if (!appIdStr) return
    setLoading(true)
    try {
      const [t, r] = await Promise.all([
        leaveApi.listTypes(appIdStr),
        leaveApi.listRequests({ appId: appIdStr }),
      ])
      setTypes(t)
      setRequests(r)
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to load leave', { variant: 'error' })
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
          <h2 className="text-2xl font-bold">Leave Management</h2>
          <p className="text-xs opacity-40">Define leave types, allocate yearly balances, and approve requests.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
        </button>
      </div>

      <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="text-xs font-semibold">Leave types</div>
        <div className="flex gap-2">
          <input className="input input-bordered input-sm w-40 font-mono" value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="key" />
          <input className="input input-bordered input-sm flex-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
          <button
            className="btn btn-primary btn-sm"
            disabled={loading || !appIdStr || !newKey.trim() || !newName.trim()}
            onClick={async () => {
              if (!appIdStr) return
              setLoading(true)
              try {
                await ensureCompanyAdmin()
                await leaveApi.upsertType(appIdStr, { key: newKey.trim(), name: newName.trim() })
                enqueueSnackbar('Leave type saved', { variant: 'success' })
                await refresh()
              } catch (e) {
                enqueueSnackbar(e instanceof Error ? e.message : 'Failed', { variant: 'error' })
              } finally {
                setLoading(false)
              }
            }}
          >
            Save
          </button>
          <button
            className="btn btn-ghost btn-sm"
            disabled={loading || !appIdStr}
            onClick={async () => {
              if (!appIdStr) return
              setLoading(true)
              try {
                await ensureCompanyAdmin()
                await leaveApi.runAllocations(appIdStr, fy, 20)
                enqueueSnackbar(`Allocations applied for FY ${fy}`, { variant: 'success' })
              } catch (e) {
                enqueueSnackbar(e instanceof Error ? e.message : 'Failed', { variant: 'error' })
              } finally {
                setLoading(false)
              }
            }}
          >
            Allocate FY {fy}
          </button>
        </div>

        {types.length === 0 ? (
          <div className="text-sm opacity-40">No leave types yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Name</th>
                  <th>Paid</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.key}>
                    <td className="font-mono text-xs">{t.key}</td>
                    <td className="text-xs">{t.name}</td>
                    <td className="text-xs">{t.isPaid ? 'Yes' : 'No'}</td>
                    <td className="text-right">
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        disabled={loading}
                        onClick={async () => {
                          if (!appIdStr) return
                          setLoading(true)
                          try {
                            await ensureCompanyAdmin()
                            await leaveApi.deleteType(appIdStr, t.key)
                            await refresh()
                          } finally {
                            setLoading(false)
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-xs font-semibold">Requests</div>
        </div>
        <div className="p-4 overflow-x-auto">
          {requests.length === 0 ? (
            <div className="text-sm opacity-40">No leave requests.</div>
          ) : (
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const name = employeeMeta[r.walletAddress]?.name
                  return (
                    <tr key={r.id}>
                      <td className="text-xs">
                        <div className="font-medium">{name ?? 'Employee'}</div>
                        <div className="font-mono text-[10px] opacity-40">{ellipseAddress(r.walletAddress, 6)}</div>
                      </td>
                      <td className="text-xs">{r.leaveTypeKey}</td>
                      <td className="text-xs">{r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)}</td>
                      <td className="text-xs">{r.days}</td>
                      <td><span className="badge badge-xs">{r.status}</span></td>
                      <td className="text-right">
                        {r.status === 'pending' && activeAddress && (
                          <div className="flex gap-1 justify-end">
                            <button className="btn btn-primary btn-xs" disabled={loading} onClick={async () => {
                              setLoading(true)
                              try {
                                await leaveApi.approve(r.id, activeAddress)
                                await refresh()
                              } finally {
                                setLoading(false)
                              }
                            }}>Approve</button>
                            <button className="btn btn-ghost btn-xs text-error" disabled={loading} onClick={async () => {
                              setLoading(true)
                              try {
                                await leaveApi.reject(r.id, activeAddress)
                                await refresh()
                              } finally {
                                setLoading(false)
                              }
                            }}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

