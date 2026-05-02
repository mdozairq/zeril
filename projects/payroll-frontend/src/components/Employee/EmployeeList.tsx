import { Employee } from '../../hooks/useEmployees'
import { useNavigate } from 'react-router-dom'
import { ellipseAddress } from '../../utils/ellipseAddress'
import { formatUsdcDisplay } from '../../utils/formatUsdc'
import type { EmployeeMeta } from '../../utils/companyStore'

interface EmployeeListProps {
  employees: Employee[]
  onRemove: (address: string) => Promise<void>
  onUpdateSalary: (address: string, newSalary: bigint) => Promise<void>
  loading: boolean
  employeeMeta?: Record<string, EmployeeMeta>
}

const EmployeeList = ({ employees, onRemove, loading, employeeMeta = {} }: EmployeeListProps) => {
  const navigate = useNavigate()
  if (employees.length === 0) {
    return <div className="text-center opacity-40 py-8 text-sm">No employees added yet.</div>
  }

  const notOptedIn = employees.filter((e) => e.isActive && !e.optedIntoUsdc)

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
              <th>Network</th>
              <th>Settlement</th>
              <th>Status</th>
              <th>USDC</th>
              <th>Last Paid</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const meta = employeeMeta[emp.address]
              return (
                <tr key={emp.address}>
                  <td className="text-xs font-medium">{meta?.name || 'Unnamed'}</td>
                  <td className="font-mono text-xs">{ellipseAddress(emp.address, 6)}</td>
                  <td className="text-xs">{formatUsdcDisplay(emp.salary)}</td>
                  <td className="text-xs">{meta?.network || 'Algorand'}</td>
                  <td className="text-xs capitalize">{meta?.settlementType || 'Crypto'}</td>
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
                  <td>
                    {emp.isActive && (
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => navigate(`/company/kyc/${emp.address}`)}
                          disabled={loading}
                        >
                          KYC
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
