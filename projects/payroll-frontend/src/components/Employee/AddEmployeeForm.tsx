import { useState } from 'react'
import algosdk from 'algosdk'
import { usdcToMicroUnits } from '../../utils/formatUsdc'

export const SUPPORTED_COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SG', name: 'Singapore' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'PH', name: 'Philippines' },
  { code: 'OTHER', name: 'Other' },
] as const

export interface AddEmployeeMeta {
  name: string
  address: string
  salaryMicroUnits: bigint
  network: string
  settlementType: 'crypto' | 'bank'
  bankDetails?: string
  country?: string
  email: string
  phone?: string
}

interface AddEmployeeFormProps {
  onAdd: (meta: AddEmployeeMeta) => Promise<void>
  loading: boolean
  canSubmit: boolean
}

const AddEmployeeForm = ({ onAdd, loading, canSubmit }: AddEmployeeFormProps) => {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [salary, setSalary] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [network, setNetwork] = useState('algorand')
  const [settlementType, setSettlementType] = useState<'crypto' | 'bank'>('crypto')
  const [bankDetails, setBankDetails] = useState('')
  const [country, setCountry] = useState('IN')

  const trimmedAddress = address.trim()
  const trimmedEmail = email.trim()
  const salaryNum = parseFloat(salary)
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
  const isValid =
    canSubmit &&
    algosdk.isValidAddress(trimmedAddress) &&
    Number.isFinite(salaryNum) &&
    salaryNum > 0 &&
    emailValid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    await onAdd({
      name,
      address: trimmedAddress,
      salaryMicroUnits: usdcToMicroUnits(salaryNum),
      network,
      settlementType,
      bankDetails: settlementType === 'bank' ? bankDetails : undefined,
      country: country !== 'OTHER' ? country : undefined,
      email: trimmedEmail,
      phone: phone.trim() || undefined,
    })
    setName('')
    setAddress('')
    setSalary('')
    setEmail('')
    setPhone('')
    setNetwork('algorand')
    setSettlementType('crypto')
    setBankDetails('')
    setCountry('IN')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!canSubmit && (
        <p className="text-xs" style={{ color: 'rgba(248,180,83,0.9)' }}>
          Complete Initialize and Bootstrap in Settings before adding employees on-chain.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label"><span className="label-text text-xs">Employee Name</span></label>
          <input
            type="text"
            placeholder="John Doe"
            className="input input-bordered input-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text text-xs">Monthly Salary (USDC)</span></label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. 5000"
            className="input input-bordered input-sm"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="form-control">
          <label className="label"><span className="label-text text-xs">Email <span className="text-error">*</span></span></label>
          <input
            type="email"
            placeholder="employee@example.com"
            className={`input input-bordered input-sm ${trimmedEmail && !emailValid ? 'input-error' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text text-xs">Phone</span></label>
          <input
            type="tel"
            placeholder="+91 9876543210"
            className="input input-bordered input-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="form-control">
        <label className="label"><span className="label-text text-xs">Wallet Address</span></label>
        <input
          type="text"
          placeholder="Algorand address (58 chars)"
          className="input input-bordered input-sm"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="form-control">
          <label className="label"><span className="label-text text-xs">Country</span></label>
          <select className="select select-bordered select-sm" value={country} onChange={(e) => setCountry(e.target.value)}>
            {SUPPORTED_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text text-xs">Receives on Network</span></label>
          <select className="select select-bordered select-sm" value={network} onChange={(e) => setNetwork(e.target.value)}>
            <option value="algorand">Algorand</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text text-xs">Settlement Type</span></label>
          <select className="select select-bordered select-sm" value={settlementType} onChange={(e) => setSettlementType(e.target.value as 'crypto' | 'bank')}>
            <option value="crypto">Crypto (USDC/ALGO)</option>
            <option value="bank">Bank Transfer (INR)</option>
          </select>
        </div>
      </div>

      {settlementType === 'bank' && (
        <div className="form-control">
          <label className="label"><span className="label-text text-xs">Bank Details</span></label>
          <input
            type="text"
            placeholder="Account number, IFSC, etc."
            className="input input-bordered input-sm"
            value={bankDetails}
            onChange={(e) => setBankDetails(e.target.value)}
          />
        </div>
      )}

      <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !isValid}>
        {loading ? <span className="loading loading-spinner loading-xs" /> : 'Add Employee'}
      </button>
    </form>
  )
}

export default AddEmployeeForm
