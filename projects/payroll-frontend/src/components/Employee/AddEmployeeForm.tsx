import { useState } from 'react'
import algosdk from 'algosdk'
import { usdcToMicroUnits } from '../../utils/formatUsdc'

interface AddEmployeeFormProps {
  onAdd: (meta: {
    name: string
    address: string
    salaryMicroUnits: bigint
    network: string
    settlementType: 'crypto' | 'bank'
    bankDetails?: string
  }) => Promise<void>
  loading: boolean
  /** When false, form should not submit (contract not fully set up) */
  canSubmit: boolean
}

const AddEmployeeForm = ({ onAdd, loading, canSubmit }: AddEmployeeFormProps) => {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [salary, setSalary] = useState('')
  const [network, setNetwork] = useState('algorand')
  const [settlementType, setSettlementType] = useState<'crypto' | 'bank'>('crypto')
  const [bankDetails, setBankDetails] = useState('')

  const trimmedAddress = address.trim()
  const salaryNum = parseFloat(salary)
  const isValid =
    canSubmit &&
    algosdk.isValidAddress(trimmedAddress) &&
    Number.isFinite(salaryNum) &&
    salaryNum > 0

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
    })
    setName('')
    setAddress('')
    setSalary('')
    setNetwork('algorand')
    setSettlementType('crypto')
    setBankDetails('')
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
