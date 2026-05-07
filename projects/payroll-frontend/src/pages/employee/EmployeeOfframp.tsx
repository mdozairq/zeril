import { useEffect, useState, useMemo } from 'react'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { useEmployee } from '../../contexts/EmployeeContext'
import { offrampApi, employeeApi, type EmployeeMetaData } from '../../services/api'
import BankDetailsForm from '../../components/Employee/BankDetailsForm'
import { ArrowRightLeft, CheckCircle, AlertCircle, Clock } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  created: 'badge-ghost',
  bridging: 'badge-warning',
  offramp_pending: 'badge-info',
  completed: 'badge-success',
  failed: 'badge-error',
}

const STATUS_ICONS: Record<string, typeof Clock> = {
  created: Clock,
  bridging: Clock,
  offramp_pending: Clock,
  completed: CheckCircle,
  failed: AlertCircle,
}

export default function EmployeeOfframp() {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const employee = useEmployee()
  const appIdStr = useMemo(() => employee.appId?.toString() ?? '', [employee.appId])

  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Awaited<ReturnType<typeof offrampApi.list>>>([])
  const [empMeta, setEmpMeta] = useState<EmployeeMetaData | null>(null)

  const hasBankDetails = useMemo(() => {
    if (!empMeta?.bankDetailsJson) return false
    try {
      const details = JSON.parse(empMeta.bankDetailsJson)
      return Object.keys(details).length > 0
    } catch { return false }
  }, [empMeta?.bankDetailsJson])

  const savedBankDetails = useMemo<Record<string, string>>(() => {
    if (!empMeta?.bankDetailsJson) return {}
    try { return JSON.parse(empMeta.bankDetailsJson) } catch { return {} }
  }, [empMeta?.bankDetailsJson])

  useEffect(() => {
    if (!activeAddress || !appIdStr) return
    employeeApi.list(appIdStr).then(list => {
      const me = list.find(e => e.walletAddress === activeAddress)
      if (me) setEmpMeta(me)
    }).catch(() => {})
  }, [activeAddress, appIdStr])

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
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" /> Bank Off-ramp
          </h2>
          <p className="text-xs opacity-50">Convert USDC salary to bank transfer via Wormhole + Saber bridge.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
        </button>
      </div>

      {/* Bank details status */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        {hasBankDetails ? (
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
            <div>
              <div className="text-sm font-semibold">Bank Details Configured</div>
              <div className="text-xs opacity-50 mt-1">
                {Object.entries(savedBankDetails).map(([k, v]) => (
                  <span key={k} className="mr-3">{k}: <span className="font-mono">{v}</span></span>
                ))}
              </div>
              <div className="text-[10px] opacity-30 mt-2">Update from Overview → Payout Preferences → Bank Transfer</div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-warning" />
              <span className="text-sm font-semibold">Set up your bank details to use off-ramp</span>
            </div>
            <BankDetailsForm
              countryCode={empMeta?.country ?? null}
              initialValues={savedBankDetails}
              onSave={async (bankDetails) => {
                if (!activeAddress || !appIdStr) return
                try {
                  await employeeApi.setPayoutPreference(appIdStr, activeAddress, {
                    payoutMethod: 'bank',
                    bankDetailsJson: JSON.stringify(bankDetails),
                  })
                  setEmpMeta(prev => prev ? { ...prev, bankDetailsJson: JSON.stringify(bankDetails), payoutMethod: 'bank' } : null)
                  enqueueSnackbar('Bank details saved', { variant: 'success' })
                } catch (e) {
                  enqueueSnackbar(e instanceof Error ? e.message : 'Failed', { variant: 'error' })
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Create request */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="text-xs font-semibold mb-2">Create Off-ramp Request</div>
        <div className="flex gap-2">
          <input
            className="input input-bordered input-sm flex-1 font-mono"
            placeholder="Amount (USDC micro-units, e.g. 5000000 = $5)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading || !hasBankDetails}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={create}
            disabled={loading || !amount.trim() || !appIdStr || !hasBankDetails}
          >
            Create
          </button>
        </div>
        {!hasBankDetails && (
          <div className="text-[10px] text-warning mt-2">Set up bank details above before creating off-ramp requests.</div>
        )}
        <div className="text-[10px] opacity-40 mt-2">
          Sandbox mode: bridge + off-ramp steps are simulated.
        </div>
      </div>

      {/* History */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-xs font-semibold">Request History ({rows.length})</div>
        </div>
        <div className="p-4 overflow-x-auto">
          {rows.length === 0 ? (
            <div className="text-sm opacity-40 p-4">No off-ramp requests yet.</div>
          ) : (
            <div className="space-y-3">
              {rows.map(r => {
                const Icon = STATUS_ICONS[r.status] || Clock
                return (
                  <div
                    key={r.id}
                    className="rounded-lg p-4 flex items-center justify-between"
                    style={{ backgroundColor: 'rgba(250,250,247,0.02)', border: '1px solid rgba(250,250,247,0.05)' }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${r.status === 'completed' ? 'text-success' : r.status === 'failed' ? 'text-error' : 'opacity-50'}`} />
                      <div>
                        <div className="font-mono text-sm font-bold">
                          ${(parseInt(r.amountUsdcMicrounits) / 1_000_000).toFixed(2)} USDC
                        </div>
                        <div className="text-[10px] opacity-40 mt-0.5">
                          {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`badge badge-sm ${STATUS_COLORS[r.status] || 'badge-ghost'}`}>{r.status}</span>
                      {r.lastError && (
                        <div className="text-[10px] text-error mt-1 max-w-[200px] truncate">{r.lastError}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
