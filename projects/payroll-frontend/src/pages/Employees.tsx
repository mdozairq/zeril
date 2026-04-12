import { useSnackbar } from 'notistack'
import { usePayroll } from '../contexts/PayrollContext'
import AddEmployeeForm from '../components/Employee/AddEmployeeForm'
import EmployeeList from '../components/Employee/EmployeeList'

const Employees = () => {
  const { enqueueSnackbar } = useSnackbar()
  const {
    employees, employeesLoading, employeeMeta, activeEmployees,
    handleAddEmployee, handleRemoveEmployee, updateSalary,
    refreshEmployees, appIdStr, loading,
  } = usePayroll()

  const handleAdd = async (address: string, salary: bigint) => {
    try {
      await handleAddEmployee('', address, (Number(salary) / 1_000_000).toString())
    } catch {
      // Error already shown by context
    }
  }

  const handleRemove = async (address: string) => {
    try {
      await handleRemoveEmployee(address)
    } catch {
      // Error already shown by context
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Employees</h2>
        <button className="btn btn-ghost btn-sm" onClick={refreshEmployees} disabled={employeesLoading}>
          {employeesLoading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
        </button>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <h3 className="text-sm font-semibold mb-4">Add New Employee</h3>
        <AddEmployeeForm onAdd={handleAdd} loading={loading} appId={appIdStr} />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
          <h3 className="text-sm font-semibold">Employee Registry ({employees.length})</h3>
        </div>
        <div className="p-4">
          <EmployeeList
            employees={employees}
            onRemove={handleRemove}
            onUpdateSalary={updateSalary}
            loading={loading}
            employeeMeta={employeeMeta}
          />
        </div>
      </div>

      {activeEmployees.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
            <h3 className="text-sm font-semibold">Token Allocations</h3>
            <p className="text-xs opacity-40 mt-1">Employee-configured salary splits</p>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>USDC %</th>
                  <th>ALGO %</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {activeEmployees.map(emp => {
                  const meta = employeeMeta[emp.address]
                  return (
                    <tr key={emp.address}>
                      <td className="text-xs">{meta?.name || 'Unnamed'}</td>
                      <td className="font-mono text-xs">{emp.usdcPercentage}%</td>
                      <td className="font-mono text-xs">{100 - emp.usdcPercentage}%</td>
                      <td className="text-xs opacity-40">On-chain</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees
