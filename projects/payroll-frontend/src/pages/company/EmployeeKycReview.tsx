import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePayroll } from '../../contexts/PayrollContext'
import { kycApi, companyApi, type KycCaseResponse } from '../../services/api'
import { ellipseAddress } from '../../utils/ellipseAddress'

export default function EmployeeKycReview() {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const { appIdStr, employeeMeta, companyName, network } = usePayroll()
  const { address } = useParams()
  const navigate = useNavigate()

  const empAddress = address ?? ''
  const displayName = useMemo(() => employeeMeta[empAddress]?.name ?? ellipseAddress(empAddress, 6), [employeeMeta, empAddress])

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<KycCaseResponse | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const adminEnsuredRef = useRef(false)
  const ensureCompanyAdmin = useCallback(async () => {
    if (adminEnsuredRef.current || !appIdStr || !activeAddress) return
    adminEnsuredRef.current = true
    await companyApi.upsert({ appId: appIdStr, name: companyName || 'Company', network, treasuryAsset: 'USDC', adminAddress: activeAddress }).catch(() => {})
  }, [appIdStr, activeAddress, companyName, network])

  const refresh = async () => {
    if (!appIdStr || !empAddress) return
    setLoading(true)
    try {
      const res = await kycApi.get(appIdStr, empAddress)
      setData(res)
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to load KYC', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appIdStr, empAddress])

  const approve = async () => {
    if (!activeAddress || !appIdStr || !empAddress) return
    setLoading(true)
    try {
      await ensureCompanyAdmin()
      await kycApi.approve(appIdStr, empAddress, activeAddress)
      enqueueSnackbar('KYC approved', { variant: 'success' })
      await refresh()
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to approve', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const reject = async () => {
    if (!activeAddress || !appIdStr || !empAddress) return
    setLoading(true)
    try {
      await ensureCompanyAdmin()
      await kycApi.reject(appIdStr, empAddress, activeAddress, rejectNote)
      enqueueSnackbar('KYC rejected', { variant: 'success' })
      setRejectNote('')
      await refresh()
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to reject', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const kyc = data?.kycCase

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/company/employees')}>←</button>
            <h2 className="text-xl font-semibold">KYC Review</h2>
          </div>
          <p className="text-xs opacity-50">{displayName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-sm">{kyc?.status ?? 'none'}</span>
          <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
          </button>
        </div>
      </div>

      {!kyc ? (
        <div className="alert text-sm">
          No KYC case found for this employee.
        </div>
      ) : (
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-40">Nationality</div>
              <div className="text-sm">{kyc.nationality || '-'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-40">Submitted</div>
              <div className="text-sm">{kyc.submittedAt ? new Date(kyc.submittedAt).toLocaleString() : '-'}</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">Documents</div>
            {kyc.documents.length === 0 ? (
              <div className="text-xs opacity-40">No documents.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>SHA256</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kyc.documents.map((d) => (
                      <tr key={d.id}>
                        <td className="text-xs">{d.docType}</td>
                        <td className="font-mono text-xs">{d.sha256}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {kyc.status === 'submitted' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2 justify-end">
                <button className="btn btn-primary btn-sm" onClick={approve} disabled={loading}>
                  Approve
                </button>
              </div>

              <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(250,250,247,0.02)', border: '1px solid rgba(250,250,247,0.06)' }}>
                <div className="text-xs font-semibold mb-2">Reject</div>
                <textarea
                  className="textarea textarea-bordered textarea-sm w-full"
                  placeholder="Reason for rejection"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  disabled={loading}
                />
                <div className="flex justify-end mt-2">
                  <button className="btn btn-ghost btn-sm text-error" onClick={reject} disabled={loading}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

