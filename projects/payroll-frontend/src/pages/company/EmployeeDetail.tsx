import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePayroll } from '../../contexts/PayrollContext'
import {
  employeeApi, kycApi, invitationApi, companyApi, paymentApi,
  type EmployeeMetaData, type KycCaseResponse, type InvitationListItem, type PayslipData,
} from '../../services/api'
import { ellipseAddress } from '../../utils/ellipseAddress'
import { formatUsdcDisplay, microUnitsToUsdc, usdcToMicroUnits } from '../../utils/formatUsdc'
import { Copy, Check, Pencil, Save, X, Mail, Phone, Globe, Wallet, FileText, ShieldCheck, Clock, AlertCircle, ExternalLink } from 'lucide-react'

export default function EmployeeDetail() {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const navigate = useNavigate()
  const { address } = useParams()
  const empAddress = address ?? ''
  const {
    appIdStr, employeeMeta, employees, companyName, network,
    updateSalary, refreshEmployees,
  } = usePayroll()

  const [dbMeta, setDbMeta] = useState<EmployeeMetaData | null>(null)
  const [kycData, setKycData] = useState<KycCaseResponse | null>(null)
  const [invitations, setInvitations] = useState<InvitationListItem[]>([])
  const [payslips, setPayslips] = useState<PayslipData[]>([])
  const [loading, setLoading] = useState(true)
  const [kycLoading, setKycLoading] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Salary edit
  const [editingSalary, setEditingSalary] = useState(false)
  const [editSalaryVal, setEditSalaryVal] = useState('')
  const [salaryUpdating, setSalaryUpdating] = useState(false)

  const onChainEmp = employees.find(e => e.address === empAddress)
  const localMeta = employeeMeta[empAddress]

  const adminEnsuredRef = useRef(false)
  const ensureCompanyAdmin = useCallback(async () => {
    if (adminEnsuredRef.current || !appIdStr || !activeAddress) return
    adminEnsuredRef.current = true
    await companyApi.upsert({ appId: appIdStr, name: companyName || 'Company', network, treasuryAsset: 'USDC', adminAddress: activeAddress }).catch(() => {})
  }, [appIdStr, activeAddress, companyName, network])

  const fetchAll = useCallback(async () => {
    if (!appIdStr || !empAddress) return
    setLoading(true)
    try {
      const [emp, kyc, invs, slips] = await Promise.allSettled([
        employeeApi.list(appIdStr).then(list => list.find(e => e.walletAddress === empAddress) || null),
        kycApi.get(appIdStr, empAddress),
        invitationApi.list(appIdStr),
        paymentApi.employeePayslips(empAddress, appIdStr).catch(() => [] as PayslipData[]),
      ])

      const fetchedEmp = emp.status === 'fulfilled' ? emp.value : null
      if (fetchedEmp) setDbMeta(fetchedEmp)
      if (kyc.status === 'fulfilled') setKycData(kyc.value)

      if (invs.status === 'fulfilled') {
        const empEmail = fetchedEmp?.email
        const empInvites = invs.value.filter(i =>
          i.employeeWalletAddress === empAddress ||
          (empEmail && i.email === empEmail)
        )
        setInvitations(empInvites)
      }

      if (slips.status === 'fulfilled') setPayslips(slips.value)
    } finally {
      setLoading(false)
    }
  }, [appIdStr, empAddress])

  useEffect(() => { fetchAll() }, [fetchAll])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }

  const CopyBtn = ({ text, field }: { text: string; field: string }) => (
    <button onClick={() => copyToClipboard(text, field)} className="btn btn-ghost btn-xs p-0.5 opacity-40 hover:opacity-100">
      {copiedField === field ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
    </button>
  )

  const handleApprovKyc = async () => {
    if (!activeAddress || !appIdStr) return
    setKycLoading(true)
    try {
      await ensureCompanyAdmin()
      await kycApi.approve(appIdStr, empAddress, activeAddress)
      enqueueSnackbar('KYC approved', { variant: 'success' })
      await fetchAll()
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to approve', { variant: 'error' })
    } finally {
      setKycLoading(false)
    }
  }

  const handleRejectKyc = async () => {
    if (!activeAddress || !appIdStr) return
    setKycLoading(true)
    try {
      await ensureCompanyAdmin()
      await kycApi.reject(appIdStr, empAddress, activeAddress, rejectNote)
      enqueueSnackbar('KYC rejected', { variant: 'success' })
      setRejectNote('')
      await fetchAll()
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to reject', { variant: 'error' })
    } finally {
      setKycLoading(false)
    }
  }

  const startSalaryEdit = () => {
    if (!onChainEmp) return
    setEditingSalary(true)
    setEditSalaryVal(microUnitsToUsdc(onChainEmp.salary))
  }

  const saveSalary = async () => {
    const val = parseFloat(editSalaryVal)
    if (!Number.isFinite(val) || val <= 0) return
    setSalaryUpdating(true)
    try {
      await updateSalary(empAddress, usdcToMicroUnits(val))
      enqueueSnackbar('Salary updated on-chain', { variant: 'success' })
      refreshEmployees()
      setEditingSalary(false)
    } catch (e) {
      enqueueSnackbar(`Failed: ${e instanceof Error ? e.message : 'Unknown'}`, { variant: 'error' })
    } finally {
      setSalaryUpdating(false)
    }
  }

  const kycBadgeClass = (status: string) => {
    const m: Record<string, string> = { approved: 'badge-success', submitted: 'badge-info', rejected: 'badge-error', pending: 'badge-warning', draft: 'badge-warning' }
    return m[status] || 'badge-ghost'
  }

  const displayName = dbMeta?.name || localMeta?.name || 'Unnamed'
  const kyc = kycData?.kycCase

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/company/employees')} className="btn btn-ghost btn-sm">&larr;</button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{displayName}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs opacity-50">{ellipseAddress(empAddress, 8)}</span>
            <CopyBtn text={empAddress} field="addr" />
            {onChainEmp && (
              <>
                <span className={`badge badge-xs ${onChainEmp.isActive ? 'badge-success' : 'badge-error'}`}>
                  {onChainEmp.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className={`badge badge-xs ${onChainEmp.optedIntoUsdc ? 'badge-success' : 'badge-warning'}`}>
                  USDC {onChainEmp.optedIntoUsdc ? 'Yes' : 'No'}
                </span>
              </>
            )}
          </div>
        </div>
        <button onClick={fetchAll} className="btn btn-ghost btn-sm text-xs">Refresh</button>
      </div>

      {/* Employee Info */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <div className="text-sm font-semibold mb-4">Employee Details</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow icon={<Wallet className="w-4 h-4" />} label="Wallet Address" value={empAddress} mono copyField="wallet" onCopy={copyToClipboard} copiedField={copiedField} />
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={dbMeta?.email || '—'} copyField={dbMeta?.email ? 'email' : undefined} onCopy={copyToClipboard} copiedField={copiedField} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={dbMeta?.phone || '—'} />
          <InfoRow icon={<Globe className="w-4 h-4" />} label="Country" value={dbMeta?.country || '—'} />

          <div className="flex items-start gap-3">
            <div className="mt-0.5 opacity-40"><Wallet className="w-4 h-4" /></div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider opacity-40 mb-0.5">Monthly Salary (USDC)</div>
              {editingSalary ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number" step="0.01" min="0"
                    className="input input-bordered input-xs w-28"
                    value={editSalaryVal}
                    onChange={e => setEditSalaryVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveSalary(); if (e.key === 'Escape') setEditingSalary(false) }}
                    autoFocus disabled={salaryUpdating}
                  />
                  <button onClick={saveSalary} disabled={salaryUpdating} className="btn btn-ghost btn-xs text-success p-0.5">
                    {salaryUpdating ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setEditingSalary(false)} disabled={salaryUpdating} className="btn btn-ghost btn-xs text-error p-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-mono">{onChainEmp ? formatUsdcDisplay(onChainEmp.salary) : '—'}</span>
                  {onChainEmp?.isActive && (
                    <button onClick={startSalaryEdit} className="btn btn-ghost btn-xs p-0.5 opacity-40 hover:opacity-100">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <InfoRow icon={<Globe className="w-4 h-4" />} label="Network" value={dbMeta?.network || localMeta?.network || 'Algorand'} />
          <InfoRow icon={<Wallet className="w-4 h-4" />} label="Settlement" value={dbMeta?.settlementType || localMeta?.settlementType || 'crypto'} />
          <InfoRow icon={<Clock className="w-4 h-4" />} label="USDC Allocation" value={onChainEmp ? `${onChainEmp.usdcPercentage}% USDC / ${100 - onChainEmp.usdcPercentage}% ALGO` : '—'} />
          <InfoRow icon={<Clock className="w-4 h-4" />} label="Last Paid" value={onChainEmp && onChainEmp.lastPaidRound > 0n ? `Round ${onChainEmp.lastPaidRound}` : 'Never'} />
          <InfoRow icon={<Wallet className="w-4 h-4" />} label="Payout Method" value={dbMeta?.payoutMethod || 'Not set'} />
          <InfoRow icon={<Clock className="w-4 h-4" />} label="Registered" value={dbMeta ? new Date(dbMeta.createdAt).toLocaleDateString() : '—'} />
        </div>
      </div>

      {/* Invitation Info */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold">Invitation</div>
          {invitations.length > 0 && (
            <span className={`badge badge-xs ${invitations.some(i => i.acceptedAt) ? 'badge-success' : 'badge-warning'}`}>
              {invitations.some(i => i.acceptedAt) ? 'Accepted' : 'Pending'}
            </span>
          )}
        </div>
        {invitations.length === 0 ? (
          <div className="text-xs opacity-40">No invitation found for this employee.</div>
        ) : (
          <div className="space-y-3">
            {invitations.map(inv => {
              const invLink = inv.code ? `${window.location.origin}/invite/${inv.code}` : null
              return (
                <div key={inv.id} className="rounded-lg p-3" style={{ backgroundColor: 'rgba(250,250,247,0.02)', border: '1px solid rgba(250,250,247,0.06)' }}>
                  {inv.code && !inv.acceptedAt && (
                    <div className="mb-3 p-2.5 rounded-lg flex items-center justify-between gap-2" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(250,250,247,0.06)' }}>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider opacity-40 mb-1">Invite Code</div>
                        <div className="font-mono text-xs truncate">{inv.code}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(invLink!, `inv-link-${inv.id}`)}
                        className="btn btn-primary btn-xs gap-1 shrink-0"
                      >
                        {copiedField === `inv-link-${inv.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === `inv-link-${inv.id}` ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="opacity-40">Email: </span>
                      <span>{inv.email}</span>
                    </div>
                    <div>
                      <span className="opacity-40">Status: </span>
                      {inv.acceptedAt ? (
                        <span className="text-success">Accepted {new Date(inv.acceptedAt).toLocaleDateString()}</span>
                      ) : new Date(inv.expiresAt) < new Date() ? (
                        <span className="text-error">Expired</span>
                      ) : (
                        <span className="text-warning">Pending</span>
                      )}
                    </div>
                    <div>
                      <span className="opacity-40">Created: </span>
                      <span>{new Date(inv.createdAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="opacity-40">Expires: </span>
                      <span className={new Date(inv.expiresAt) < new Date() ? 'text-error' : ''}>
                        {new Date(inv.expiresAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Re-generate invite */}
        {dbMeta?.email && (
          <button
            className="btn btn-ghost btn-xs mt-3"
            onClick={async () => {
              try {
                await ensureCompanyAdmin()
                const inv = await invitationApi.create(appIdStr, { email: dbMeta.email!, actorAddress: activeAddress ?? undefined })
                const link = `${window.location.origin}/invite/${inv.inviteCode}`
                await navigator.clipboard.writeText(link)
                enqueueSnackbar('New invite created & link copied!', { variant: 'success' })
                fetchAll()
              } catch (e) {
                enqueueSnackbar(e instanceof Error ? e.message : 'Failed', { variant: 'error' })
              }
            }}
          >
            Re-generate & Copy Invite Link
          </button>
        )}
      </div>

      {/* KYC Section */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 opacity-60" />
            <div className="text-sm font-semibold">KYC Documents</div>
          </div>
          <span className={`badge badge-sm ${kycBadgeClass(kyc?.status || dbMeta?.kycStatus || 'pending')}`}>
            {kyc?.status || dbMeta?.kycStatus || 'pending'}
          </span>
        </div>

        {!kyc ? (
          <div className="flex items-center gap-2 text-xs opacity-40">
            <AlertCircle className="w-4 h-4" />
            No KYC case submitted yet.
          </div>
        ) : (
          <div className="space-y-4">
            {/* KYC Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="opacity-40">Nationality: </span>
                <span>{kyc.nationality || '—'}</span>
              </div>
              <div>
                <span className="opacity-40">Submitted: </span>
                <span>{kyc.submittedAt ? new Date(kyc.submittedAt).toLocaleString() : '—'}</span>
              </div>
              {kyc.reviewedAt && (
                <div>
                  <span className="opacity-40">Reviewed: </span>
                  <span>{new Date(kyc.reviewedAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {kyc.rejectionNote && (
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                <span className="font-semibold text-error">Rejection Note: </span>
                {kyc.rejectionNote}
              </div>
            )}

            {/* Documents */}
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">Documents ({kyc.documents.length})</div>
              {kyc.documents.length === 0 ? (
                <div className="text-xs opacity-40">No documents uploaded.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>SHA256</th>
                        <th>File</th>
                        <th>Uploaded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kyc.documents.map(doc => (
                        <tr key={doc.id}>
                          <td className="text-xs font-medium">{doc.docType}</td>
                          <td className="font-mono text-[10px] max-w-[200px] truncate">{doc.sha256}</td>
                          <td>
                            {doc.fileUrl ? (
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs gap-1">
                                <ExternalLink className="w-3 h-3" /> View
                              </a>
                            ) : doc.pinataCid ? (
                              <a href={`https://gateway.pinata.cloud/ipfs/${doc.pinataCid}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs gap-1">
                                <ExternalLink className="w-3 h-3" /> IPFS
                              </a>
                            ) : (
                              <span className="text-xs opacity-40">—</span>
                            )}
                          </td>
                          <td className="text-xs opacity-40">{new Date(doc.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Approve / Reject */}
            {kyc.status === 'submitted' && (
              <div className="rounded-lg p-4" style={{ backgroundColor: 'rgba(250,250,247,0.02)', border: '1px solid rgba(250,250,247,0.06)' }}>
                <div className="text-xs font-semibold mb-3">Review KYC</div>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-sm" onClick={handleApprovKyc} disabled={kycLoading}>
                      {kycLoading ? <span className="loading loading-spinner loading-xs" /> : 'Approve KYC'}
                    </button>
                  </div>
                  <div>
                    <textarea
                      className="textarea textarea-bordered textarea-sm w-full"
                      placeholder="Reason for rejection (optional)"
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      disabled={kycLoading}
                      rows={2}
                    />
                    <div className="flex justify-end mt-2">
                      <button className="btn btn-ghost btn-sm text-error" onClick={handleRejectKyc} disabled={kycLoading}>
                        Reject KYC
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment History */}
      {payslips.length > 0 && (
        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 opacity-60" />
            <div className="text-sm font-semibold">Payment History ({payslips.length})</div>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Payroll Run</th>
                  <th>Date</th>
                  <th>Gross</th>
                  <th>Tax</th>
                  <th>Net</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map(slip => (
                  <tr key={slip.paymentId}>
                    <td className="text-xs font-medium">{slip.payrollRunName}</td>
                    <td className="text-xs opacity-50">{new Date(slip.runDate).toLocaleDateString()}</td>
                    <td className="font-mono text-xs">${parseFloat(slip.grossAmount).toFixed(2)}</td>
                    <td className="font-mono text-xs text-warning">${parseFloat(slip.taxWithheld).toFixed(2)}</td>
                    <td className="font-mono text-xs text-success">${parseFloat(slip.netAmount).toFixed(2)}</td>
                    <td>
                      <span className={`badge badge-xs ${slip.status === 'completed' ? 'badge-success' : slip.status === 'failed' ? 'badge-error' : 'badge-warning'}`}>
                        {slip.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, value, mono, copyField, onCopy, copiedField }: {
  icon?: React.ReactNode
  label: string
  value: string
  mono?: boolean
  copyField?: string
  onCopy?: (text: string, field: string) => void
  copiedField?: string | null
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 opacity-40">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider opacity-40 mb-0.5">{label}</div>
        <div className="flex items-center gap-1">
          <span className={`text-sm ${mono ? 'font-mono' : ''} truncate`}>{value}</span>
          {copyField && onCopy && value !== '—' && (
            <button onClick={() => onCopy(value, copyField)} className="btn btn-ghost btn-xs p-0.5 opacity-40 hover:opacity-100 shrink-0">
              {copiedField === copyField ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
