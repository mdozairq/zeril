import { useState } from 'react'
import { usdcToMicroUnits } from '../../utils/formatUsdc'

interface AddEmployeeFormProps {
  onAdd: (address: string, salaryMicroUnits: bigint) => Promise<void>
  loading: boolean
}

const AddEmployeeForm = ({ onAdd, loading }: AddEmployeeFormProps) => {
  const [address, setAddress] = useState('')
  const [salary, setSalary] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !salary) return
    await onAdd(address, usdcToMicroUnits(parseFloat(salary)))
    setAddress('')
    setSalary('')
  }

  const isValid = address.length === 58 && parseFloat(salary) > 0

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end flex-wrap">
      <div className="form-control flex-1 min-w-[200px]">
        <label className="label"><span className="label-text">Wallet Address</span></label>
        <input
          type="text"
          placeholder="Algorand address (58 chars)"
          className="input input-bordered input-sm"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <div className="form-control w-40">
        <label className="label"><span className="label-text">Monthly Salary (USDC)</span></label>
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
      <button type="submit" className={`btn btn-primary btn-sm ${!isValid ? 'btn-disabled' : ''}`} disabled={loading}>
        {loading ? <span className="loading loading-spinner loading-xs" /> : 'Add Employee'}
      </button>
    </form>
  )
}

export default AddEmployeeForm
