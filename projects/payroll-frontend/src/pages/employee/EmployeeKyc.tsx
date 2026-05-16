import { useEffect, useMemo, useState, useRef } from 'react'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { useEmployee } from '../../contexts/EmployeeContext'
import { kycApi, countryApi, kycDocumentViewUrl, type KycDocInput, type KycCaseResponse } from '../../services/api'
import { resolveApiToken, waitForApiAuth } from '../../auth/walletAuth'
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const DOC_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  national_id: 'National ID',
  driver_license: 'Driver License',
  residence_permit: 'Residence Permit',
  pan_card: 'PAN Card',
  aadhaar: 'Aadhaar Card',
  ssn: 'SSN Document',
  emirates_id: 'Emirates ID',
  nric: 'NRIC',
}

type DocDraft = KycDocInput & {
  id: string
  fileName?: string
  uploading?: boolean
  pinataCid?: string
  fileUrl?: string
}

function newDocDraft(docType = 'passport'): DocDraft {
  return { id: crypto.randomUUID(), docType, sha256: '' }
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
  const [requiredDocs, setRequiredDocs] = useState<string[]>([])
  const [employeeCountry, setEmployeeCountry] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (data?.employee?.country) {
      setEmployeeCountry(data.employee.country)
      countryApi.kycDocs(data.employee.country).then(setRequiredDocs).catch(() => {})
    }
  }, [data?.employee?.country])

  const refresh = async () => {
    if (!activeAddress || !appIdStr) return
    setLoading(true)
    try {
      const res = await kycApi.get(appIdStr, activeAddress)
      setData(res)
      setNationality(res.kycCase?.nationality ?? '')
      const existingDocs = res.kycCase?.documents ?? []
      if (existingDocs.length > 0) {
        setDocs(existingDocs.map((d) => ({
          id: crypto.randomUUID(),
          docType: d.docType,
          sha256: d.sha256,
          country: d.country ?? undefined,
          issuedAt: d.issuedAt ?? undefined,
          expiresAt: d.expiresAt ?? undefined,
          reference: d.reference ?? undefined,
          pinataCid: d.pinataCid ?? undefined,
          fileUrl: d.pinataCid ? kycDocumentViewUrl(d.pinataCid) : (d.fileUrl ?? undefined),
          fileName: d.pinataCid ? `${d.docType} (uploaded)` : undefined,
        })))
      } else if (requiredDocs.length > 0) {
        setDocs(requiredDocs.map(dt => newDocDraft(dt)))
      } else {
        setDocs([newDocDraft()])
      }
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

  useEffect(() => {
    if (requiredDocs.length > 0 && docs.length === 1 && !docs[0].sha256) {
      setDocs(requiredDocs.map(dt => newDocDraft(dt)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredDocs])

  const handleFileUpload = async (docId: string, file: File) => {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, uploading: true } : d))

    try {
      const formData = new FormData()
      formData.append('file', file)

      let token = resolveApiToken() ?? (await waitForApiAuth(12_000))
      const res = await fetch(`${API_BASE}/api/kyc/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Upload failed: ${res.status}`)
      }

      const result = await res.json() as {
        sha256: string
        cid: string
        url: string
        apiViewUrl?: string
        fileName: string
      }

      const viewUrl = result.apiViewUrl
        ? `${API_BASE}${result.apiViewUrl}`
        : kycDocumentViewUrl(result.cid)

      setDocs(prev => prev.map(d => d.id === docId ? {
        ...d,
        sha256: result.sha256,
        pinataCid: result.cid,
        fileUrl: viewUrl,
        fileName: result.fileName,
        uploading: false,
      } : d))

      enqueueSnackbar(`${file.name} uploaded`, { variant: 'success' })
    } catch (e) {
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, uploading: false } : d))
      enqueueSnackbar(e instanceof Error ? e.message : 'Upload failed', { variant: 'error' })
    }
  }

  const saveDraft = async () => {
    if (!activeAddress || !appIdStr) return
    setLoading(true)
    try {
      const documents = docs
        .filter((d) => d.sha256.trim().length > 0 && d.docType.trim().length > 0)
        .map(({ id: _id, fileName: _fn, uploading: _u, ...d }) => d)
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
  const editable = status === 'draft' || status === 'rejected'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">KYC Verification</h2>
          <p className="text-xs opacity-50">
            Upload documents for identity verification.
            {employeeCountry && <span className="ml-1 badge badge-ghost badge-xs">{employeeCountry}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge badge-sm ${
            status === 'approved' ? 'badge-success' :
            status === 'rejected' ? 'badge-error' :
            status === 'submitted' ? 'badge-warning' : 'badge-ghost'
          }`}>{status}</span>
          <button className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
            {loading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
          </button>
        </div>
      </div>

      {data?.kycCase?.rejectionNote && (
        <div className="alert alert-error text-sm">
          <XCircle className="w-4 h-4" />
          <div>
            <div className="font-semibold">Rejected</div>
            <div className="text-xs opacity-80">{data.kycCase.rejectionNote}</div>
          </div>
        </div>
      )}

      {requiredDocs.length > 0 && (
        <div className="alert alert-info text-sm">
          <FileText className="w-4 h-4" />
          <div>
            <span className="font-semibold">Required documents for {employeeCountry}:</span>{' '}
            {requiredDocs.map(d => DOC_TYPE_LABELS[d] || d).join(', ')}
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
              disabled={loading || !editable}
              placeholder="e.g. IN"
            />
          </label>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">Documents</div>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setDocs((p) => [...p, newDocDraft()])}
              disabled={loading || !editable}
            >
              Add document
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {docs.map((d) => (
              <div
                key={d.id}
                className="rounded-lg p-3 space-y-2"
                style={{ backgroundColor: 'rgba(250,250,247,0.02)', border: '1px solid rgba(250,250,247,0.06)' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <select
                    className="select select-bordered select-sm"
                    value={d.docType}
                    disabled={loading || !editable}
                    onChange={(e) => setDocs((p) => p.map((x) => x.id === d.id ? { ...x, docType: e.target.value } : x))}
                  >
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                    <option value="driver_license">Driver License</option>
                    <option value="residence_permit">Residence Permit</option>
                    <option value="pan_card">PAN Card</option>
                    <option value="aadhaar">Aadhaar Card</option>
                    <option value="ssn">SSN Document</option>
                    <option value="emirates_id">Emirates ID</option>
                    <option value="nric">NRIC</option>
                  </select>

                  <div className="md:col-span-2 flex items-center gap-2">
                    {d.pinataCid ? (
                      <div className="flex items-center gap-2 text-xs flex-1">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="truncate">{d.fileName || d.pinataCid}</span>
                        {d.pinataCid && (
                          <a href={d.fileUrl || kycDocumentViewUrl(d.pinataCid)} target="_blank" rel="noreferrer" className="link link-primary text-xs">View</a>
                        )}
                      </div>
                    ) : d.uploading ? (
                      <div className="flex items-center gap-2 text-xs flex-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="file"
                          ref={el => { fileInputRefs.current[d.id] = el }}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          disabled={loading || !editable}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileUpload(d.id, file)
                          }}
                        />
                        <button
                          className="btn btn-outline btn-sm gap-1"
                          onClick={() => fileInputRefs.current[d.id]?.click()}
                          disabled={loading || !editable}
                        >
                          <Upload className="w-3 h-3" /> Upload File
                        </button>
                        <span className="text-[10px] opacity-40">or</span>
                        <input
                          className="input input-bordered input-sm flex-1 font-mono text-xs"
                          placeholder="sha256 hash (manual)"
                          value={d.sha256}
                          disabled={loading || !editable}
                          onChange={(e) => setDocs((p) => p.map((x) => x.id === d.id ? { ...x, sha256: e.target.value } : x))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      className="btn btn-ghost btn-sm text-error"
                      onClick={() => setDocs((p) => p.filter((x) => x.id !== d.id))}
                      disabled={loading || docs.length <= 1 || !editable}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-2 justify-end">
          <button className="btn btn-ghost btn-sm" onClick={saveDraft} disabled={loading || !editable}>
            Save draft
          </button>
          <button className="btn btn-primary btn-sm" onClick={submit} disabled={loading || !editable}>
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
