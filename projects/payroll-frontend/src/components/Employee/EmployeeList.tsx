import { useState } from 'react'
import { Employee } from '../../hooks/useEmployees'
import { useNavigate } from 'react-router-dom'
import { ellipseAddress } from '../../utils/ellipseAddress'
import { formatUsdcDisplay, usdcToMicroUnits, microUnitsToUsdc } from '../../utils/formatUsdc'
import type { EmployeeMeta } from '../../utils/companyStore'
import type { EmployeeMetaData } from '../../services/api'
import { Copy, Check, Pencil, Save, X } from 'lucide-react'

interface EmployeeListProps {
  employees: Employee[]
  onRemove: (address: string) => Promise<void>
  onUpdateSalary: (address: string, newSalary: bigint) => Promise<void>
  loading: boolean
  employeeMeta?: Record<string, EmployeeMeta>
  backendMeta?: EmployeeMetaData[]
}

const kycBadge = (status: string) => {
  const styles: Record<string, string> = {
    approved: 'badge-success',
    submitted: 'badge-info',
    rejected: 'badge-error',
    pending: 'badge-warning',
    draft: 'badge-warning',
  }
  return (
    <span className={`badge badge-xs ${styles[status] || 'badge-ghost'}`}>
      {status}
    </span>
  )
}

const EmployeeList = ({ employees, onRemove, onUpdateSalary, loading, employeeMeta = {}, backendMeta = [] }: EmployeeListProps) => {
  const navigate = useNavigate()
  const [editingAddr, setEditingAddr] = useState<string | null>(null)
  const [editSalary, setEditSalary] = useState('')
  const [salaryUpdating, setSalaryUpdating] = useState(false)
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null)

  const backendMap = new Map(backendMeta.map(m => [m.walletAddress, m]))

  if (employees.length === 0) {
    return <div className="text-center opacity-40 py-8 text-sm">No employees added yet.</div>
  }

  const notOptedIn = employees.filter((e) => e.isActive && !e.optedIntoUsdc)

  const startEdit = (addr: string, currentSalary: bigint) => {
    setEditingAddr(addr)
    setEditSalary(microUnitsToUsdc(currentSalary))
  }

  const cancelEdit = () => {
    setEditingAddr(null)
    setEditSalary('')
  }

  const saveEdit = async (addr: string) => {
    const val = parseFloat(editSalary)
    if (!Number.isFinite(val) || val <= 0) return
    setSalaryUpdating(true)
    try {
      await onUpdateSalary(addr, usdcToMicroUnits(val))
      setEditingAddr(null)
      setEditSalary('')
    } finally {
      setSalaryUpdating(false)
    }
  }

  const copyInviteLink = (addr: string) => {
    const dbMeta = backendMap.get(addr)
    const text = dbMeta?.email
      ? `Invite for ${dbMeta.name}: ${window.location.origin}/invite/ (share the invite code from the creation step)`
      : addr
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAddr(addr)
      setTimeout(() => setCopiedAddr(null), 2000)
    })
  }

  return (
    <div className="space-y-4">
      {notOptedIn.length > 0 && (
        <div className="alert alert-warning text-sm">
          {notOptedIn.length} employee(s) have not opted into USDC. They must opt in before receiving payment.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Salary</th>
              <th>KYC</th>
              <th>Status</th>
              <th>USDC</th>
              <th>Last Paid</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const meta = employeeMeta[emp.address]
              const dbMeta = backendMap.get(emp.address)
              const kycStatus = dbMeta?.kycStatus || 'pending'
              const isEditing = editingAddr === emp.address
              return (
                <tr key={emp.address} className="hover:bg-white/[0.02] cursor-pointer" onClick={() => navigate(`/company/employees/${emp.address}`)}>
                  <td className="text-xs font-medium">{meta?.name || dbMeta?.name || 'Unnamed'}</td>
                  <td className="font-mono text-xs">{ellipseAddress(emp.address, 6)}</td>
                  <td className="text-xs" onClick={e => e.stopPropagation()}>
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="input input-bordered input-xs w-24"
                          value={editSalary}
                          onChange={(e) => setEditSalary(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(emp.address)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          disabled={salaryUpdating}
                        />
                        <button onClick={() => saveEdit(emp.address)} disabled={salaryUpdating} className="btn btn-ghost btn-xs text-success p-0.5">
                          {salaryUpdating ? <span className="loading loading-spinner loading-xs" /> : <Save className="w-3 h-3" />}
                        </button>
                        <button onClick={cancelEdit} disabled={salaryUpdating} className="btn btn-ghost btn-xs text-error p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span>{formatUsdcDisplay(emp.salary)}</span>
                        {emp.isActive && (
                          <button onClick={() => startEdit(emp.address, emp.salary)} className="btn btn-ghost btn-xs p-0.5 opacity-40 hover:opacity-100">
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td>{kycBadge(kycStatus)}</td>
                  <td>
                    <span className={`badge badge-xs ${emp.isActive ? 'badge-success' : 'badge-error'}`}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-xs ${emp.optedIntoUsdc ? 'badge-success' : 'badge-warning'}`}>
                      {emp.optedIntoUsdc ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="text-xs opacity-40">{emp.lastPaidRound > 0n ? `R${emp.lastPaidRound}` : 'Never'}</td>
                  <td onClick={e => e.stopPropagation()}>
                    {emp.isActive && (
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => copyInviteLink(emp.address)}
                          title="Copy address"
                        >
                          {copiedAddr === emp.address ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => onRemove(emp.address)}
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default EmployeeList
