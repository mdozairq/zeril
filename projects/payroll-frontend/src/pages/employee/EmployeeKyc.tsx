import { useEffect, useMemo, useState } from 'react'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { useEmployee } from '../../contexts/EmployeeContext'
import { kycApi, type KycDocInput, type KycCaseResponse } from '../../services/api'

type DocDraft = KycDocInput & { id: string }

function newDocDraft(): DocDraft {
  return { id: crypto.randomUUID(), docType: 'passport', sha256: '' }
}

export default function EmployeeKyc() {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const employee = useEmployee()

  const appIdStr = useMemo(() => employee.appId?.toString() ?? '', [employee.appId])

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<KycCaseResponse | null>(null)
  const [nationality, setNationality] = useState('')
  const [docs, setDocs] = useState<DocDraft[]>([newDocDraft()])

  const refresh = async () => {
    if (!activeAddress || !appIdStr) return
    setLoading(true)
    try {
      const res = await kycApi.get(appIdStr, activeAddress)
      setData(res)
      setNationality(res.kycCase?.nationality ?? '')
      const existingDocs = res.kycCase?.documents ?? []
      setDocs(existingDocs.length > 0
        ? existingDocs.map((d) => ({
            id: crypto.randomUUID(),
            docType: d.docType,
            sha256: d.sha256,
            country: d.country ?? undefined,
            issuedAt: d.issuedAt ?? undefined,
            expiresAt: d.expiresAt ?? undefined,
            reference: d.reference ?? undefined,
          }))
        : [newDocDraft()])
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to load KYC', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress, appIdStr])

  const saveDraft = async () => {
    if (!activeAddress || !appIdStr) return
    setLoading(true)
    try {
      const documents = docs
        .map(({ id: _id, ...d }) => d)
        .filter((d) => d.sha256.trim().length > 0 && d.docType.trim().length > 0)
      await kycApi.upsertDraft(appIdStr, activeAddress, { nationality, documents })
      enqueueSnackbar('KYC draft saved', { variant: 'success' })
      await refresh()
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to save draft', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const submit = async () => {
    if (!activeAddress || !appIdStr) return
    setLoading(true)
    try {
      await saveDraft()
      await kycApi.submit(appIdStr, activeAddress, activeAddress)
      enqueueSnackbar('KYC submitted', { variant: 'success' })
      await refresh()
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to submit', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const status = data?.kycCase?.status ?? 'draft'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">KYC</h2>
          <p className="text-xs opacity-50">Submit document hashes for verification.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-sm">{status}</span>
          <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
          </button>
        </div>
      </div>

      {data?.kycCase?.rejectionNote && (
        <div className="alert alert-error text-sm">
          <div>
            <div className="font-semibold">Rejected</div>
            <div className="text-xs opacity-80">{data.kycCase.rejectionNote}</div>
          </div>
        </div>
      )}

      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="form-control">
            <span className="label-text text-xs opacity-60">Nationality</span>
            <input
              className="input input-bordered input-sm"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              disabled={loading || status === 'submitted' || status === 'approved'}
              placeholder="e.g. IN"
            />
          </label>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">Documents (hash-only)</div>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setDocs((p) => [...p, newDocDraft()])}
              disabled={loading || status === 'submitted' || status === 'approved'}
            >
              Add document
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {docs.map((d, idx) => (
              <div
                key={d.id}
                className="rounded-lg p-3 grid grid-cols-1 md:grid-cols-5 gap-2"
                style={{ backgroundColor: 'rgba(250,250,247,0.02)', border: '1px solid rgba(250,250,247,0.06)' }}
              >
                <select
                  className="select select-bordered select-sm"
                  value={d.docType}
                  disabled={loading || status === 'submitted' || status === 'approved'}
                  onChange={(e) => setDocs((p) => p.map((x) => x.id === d.id ? { ...x, docType: e.target.value } : x))}
                >
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID</option>
                  <option value="driver_license">Driver License</option>
                  <option value="residence_permit">Residence Permit</option>
                </select>
                <input
                  className="input input-bordered input-sm md:col-span-3 font-mono"
                  placeholder="sha256 hash (hex)"
                  value={d.sha256}
                  disabled={loading || status === 'submitted' || status === 'approved'}
                  onChange={(e) => setDocs((p) => p.map((x) => x.id === d.id ? { ...x, sha256: e.target.value } : x))}
                />
                <div className="flex justify-end">
                  <button
                    className="btn btn-ghost btn-sm text-error"
                    onClick={() => setDocs((p) => p.filter((x) => x.id !== d.id))}
                    disabled={loading || docs.length <= 1 || status === 'submitted' || status === 'approved'}
                  >
                    Remove
                  </button>
                </div>
                <div className="md:col-span-5 text-[10px] opacity-40">
                  Tip: compute with `shasum -a 256 file.pdf` (store file locally; only submit the hash here).
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <button className="btn btn-ghost btn-sm" onClick={saveDraft} disabled={loading || status === 'submitted' || status === 'approved'}>
            Save draft
          </button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading || status === 'submitted' || status === 'approved'}>
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

