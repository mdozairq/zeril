import { useState } from 'react'
import { usdcToMicroUnits } from '../../utils/formatUsdc'
import { saveEmployeeMeta } from '../../utils/companyStore'

interface AddEmployeeFormProps {
  onAdd: (address: string, salaryMicroUnits: bigint) => Promise<void>
  loading: boolean
  appId: string
}

const AddEmployeeForm = ({ onAdd, loading, appId }: AddEmployeeFormProps) => {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [salary, setSalary] = useState('')
  const [network, setNetwork] = useState('algorand')
  const [settlementType, setSettlementType] = useState<'crypto' | 'bank'>('crypto')
  const [bankDetails, setBankDetails] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !salary) return

    // Save employee metadata locally
    if (appId) {
      saveEmployeeMeta(appId, address, {
        name: name || 'Unnamed',
        network,
        settlementType,
        bankDetails: settlementType === 'bank' ? bankDetails : undefined,
      })
    }

    await onAdd(address, usdcToMicroUnits(parseFloat(salary)))
    setName('')
    setAddress('')
    setSalary('')
    setNetwork('algorand')
    setSettlementType('crypto')
    setBankDetails('')
  }

  const isValid = address.length === 58 && parseFloat(salary) > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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

      <button type="submit" className={`btn btn-primary btn-sm ${!isValid ? 'btn-disabled' : ''}`} disabled={loading}>
        {loading ? <span className="loading loading-spinner loading-xs" /> : 'Add Employee'}
      </button>
    </form>
  )
}

export default AddEmployeeForm
