import { useEffect, useState } from 'react'
import { countryApi, type BankFieldDef } from '../../services/api'
import { Building2 } from 'lucide-react'

interface BankDetailsFormProps {
  countryCode: string | null
  initialValues?: Record<string, string>
  onSave: (bankDetails: Record<string, string>) => Promise<void>
  disabled?: boolean
}

export default function BankDetailsForm({ countryCode, initialValues, onSave, disabled }: BankDetailsFormProps) {
  const [fields, setFields] = useState<BankFieldDef[]>([])
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {})
  const [saving, setSaving] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)

  useEffect(() => {
    if (!countryCode) {
      setFields([
        { key: 'accountHolderName', label: 'Account Holder Name', required: true },
        { key: 'accountNumber', label: 'Account Number', required: true },
        { key: 'bankName', label: 'Bank Name', required: true },
        { key: 'swiftCode', label: 'SWIFT/BIC Code', required: false },
      ])
      return
    }
    setLoadingFields(true)
    countryApi.bankFields(countryCode)
      .then(f => setFields(f))
      .catch(() => {
        setFields([
          { key: 'accountHolderName', label: 'Account Holder Name', required: true },
          { key: 'accountNumber', label: 'Account Number', required: true },
          { key: 'bankName', label: 'Bank Name', required: true },
        ])
      })
      .finally(() => setLoadingFields(false))
  }, [countryCode])

  useEffect(() => {
    if (initialValues) setValues(initialValues)
  }, [initialValues])

  const requiredMissing = fields.filter(f => f.required && !values[f.key]?.trim())
  const canSave = requiredMissing.length === 0 && fields.length > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave(values)
    } finally {
      setSaving(false)
    }
  }

  if (loadingFields) {
    return <div className="flex items-center gap-2 text-xs opacity-50"><span className="loading loading-spinner loading-xs" /> Loading bank fields...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="w-4 h-4 opacity-50" />
        <span className="text-xs font-semibold">Bank Details{countryCode ? ` (${countryCode})` : ''}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key} className="form-control">
            <label className="label">
              <span className="label-text text-xs">
                {f.label}
                {f.required && <span className="text-error ml-1">*</span>}
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm"
              placeholder={f.placeholder || ''}
              value={values[f.key] ?? ''}
              onChange={(e) => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
              disabled={disabled || saving}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          className="btn btn-primary btn-sm"
          disabled={!canSave || saving || disabled}
          onClick={handleSave}
        >
          {saving ? <span className="loading loading-spinner loading-xs" /> : 'Save Bank Details'}
        </button>
      </div>
    </div>
  )
}
