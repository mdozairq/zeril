import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { invitationApi, companyApi } from '../services/api'
import { saveCompany } from '../utils/companyStore'
import { saveEmployeeContractAppId } from '../utils/employeeContractMapping'
import { useWalletModal } from '../Home'

export default function InviteAccept() {
  const { code } = useParams()
  const inviteCode = code ?? ''
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const { openWalletModal } = useWalletModal()

  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState<{ companyAppId: string; companyName: string; email: string; expiresAt: string } | null>(null)
  const [name, setName] = useState('')

  const expiresLabel = useMemo(() => info?.expiresAt ? new Date(info.expiresAt).toLocaleString() : '-', [info?.expiresAt])

  useEffect(() => {
    const run = async () => {
      if (!inviteCode) return
      setLoading(true)
      try {
        const res = await invitationApi.get(inviteCode)
        setInfo(res)
      } catch (e) {
        enqueueSnackbar(e instanceof Error ? e.message : 'Invalid invitation', { variant: 'error' })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [inviteCode, enqueueSnackbar])

  const accept = async () => {
    if (!inviteCode || !activeAddress || !info) return
    setLoading(true)
    try {
      const accepted = await invitationApi.accept(inviteCode, { walletAddress: activeAddress, name, actorAddress: activeAddress })

      const company = await companyApi.get(accepted.companyAppId)
      saveCompany(accepted.companyAppId, {
        name: company.name,
        appId: company.appId,
        network: company.network,
        treasuryAsset: company.treasuryAsset,
      })
      saveEmployeeContractAppId(activeAddress, accepted.companyAppId)

      enqueueSnackbar('Invite accepted. You can now connect as an employee.', { variant: 'success' })
      navigate('/employee', { replace: true })
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to accept invite', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Accept Invitation</h1>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>Exit</button>
        </div>

        {!info ? (
          <div className="mt-6 text-sm opacity-50">
            {loading ? 'Loading invitation...' : 'Invitation not found or expired.'}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="text-sm">
              <div className="opacity-50 text-xs">Company</div>
              <div className="font-semibold">{info.companyName}</div>
            </div>
            <div className="text-sm">
              <div className="opacity-50 text-xs">Invited email</div>
              <div className="font-mono text-xs">{info.email}</div>
            </div>
            <div className="text-sm">
              <div className="opacity-50 text-xs">Expires</div>
              <div className="text-xs">{expiresLabel}</div>
            </div>

            <label className="form-control">
              <span className="label-text text-xs opacity-60">Your name (optional)</span>
              <input
                className="input input-bordered input-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                placeholder="e.g. Alice"
              />
            </label>

            {!activeAddress ? (
              <button className="btn btn-primary btn-sm w-full" onClick={openWalletModal} disabled={loading}>
                Connect wallet to accept
              </button>
            ) : (
              <button className="btn btn-primary btn-sm w-full" onClick={accept} disabled={loading}>
                {loading ? <span className="loading loading-spinner loading-xs" /> : 'Accept invitation'}
              </button>
            )}

            <div className="text-[10px] opacity-40">
              After accepting, go to Employee mode and connect using the employer’s App ID.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

