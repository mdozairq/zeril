import { Employee } from '../../hooks/useEmployees'
import { ellipseAddress } from '../../utils/ellipseAddress'
import { formatUsdcDisplay } from '../../utils/formatUsdc'

interface EmployeeListProps {
  employees: Employee[]
  onRemove: (address: string) => Promise<void>
  onUpdateSalary: (address: string, newSalary: bigint) => Promise<void>
  loading: boolean
}

const EmployeeList = ({ employees, onRemove, loading }: EmployeeListProps) => {
  if (employees.length === 0) {
    return <div className="text-center text-base-content/60 py-8">No employees added yet.</div>
  }

  const notOptedIn = employees.filter((e) => e.isActive && !e.optedIntoUsdc)

  return (
    <div className="space-y-4">
      {notOptedIn.length > 0 && (
        <div className="alert alert-warning text-sm">
          {notOptedIn.length} employee(s) have not opted into USDC. They must opt into ASA before receiving payment.
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Address</th>
              <th>Monthly Salary</th>
              <th>Status</th>
              <th>USDC Opt-in</th>
              <th>Last Paid</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.address}>
                <td className="font-mono text-xs">{ellipseAddress(emp.address, 8)}</td>
                <td>{formatUsdcDisplay(emp.salary)}</td>
                <td>
                  <span className={`badge badge-sm ${emp.isActive ? 'badge-success' : 'badge-error'}`}>
                    {emp.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-sm ${emp.optedIntoUsdc ? 'badge-success' : 'badge-warning'}`}>
                    {emp.optedIntoUsdc ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>{emp.lastPaidRound > 0n ? `Round ${emp.lastPaidRound}` : 'Never'}</td>
                <td>
                  {emp.isActive && (
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() => onRemove(emp.address)}
                      disabled={loading}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default EmployeeList
