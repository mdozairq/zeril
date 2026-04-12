import { useSnackbar } from 'notistack'
import AddEmployeeForm from '../components/Employee/AddEmployeeForm'
import EmployeeList from '../components/Employee/EmployeeList'
import { Employee } from '../hooks/useEmployees'
import { loadAllEmployeeMeta } from '../utils/companyStore'

interface EmployeesProps {
  employees: Employee[]
  loading: boolean
  onAddEmployee: (address: string, salary: bigint) => Promise<void>
  onRemoveEmployee: (address: string) => Promise<void>
  onUpdateSalary: (address: string, newSalary: bigint) => Promise<void>
  onRefresh: () => void
  appId: string
}

const Employees = ({ employees, loading, onAddEmployee, onRemoveEmployee, onUpdateSalary, onRefresh, appId }: EmployeesProps) => {
  const { enqueueSnackbar } = useSnackbar()
  const employeeMeta = loadAllEmployeeMeta(appId)

  const handleAdd = async (address: string, salary: bigint) => {
    try {
      await onAddEmployee(address, salary)
      enqueueSnackbar('Employee added successfully', { variant: 'success' })
      onRefresh()
    } catch (e: unknown) {
      enqueueSnackbar(`Failed to add employee: ${e instanceof Error ? e.message : 'Unknown error'}`, { variant: 'error' })
    }
  }

  const handleRemove = async (address: string) => {
    try {
      await onRemoveEmployee(address)
      enqueueSnackbar('Employee removed', { variant: 'success' })
      onRefresh()
    } catch (e: unknown) {
      enqueueSnackbar(`Failed to remove employee: ${e instanceof Error ? e.message : 'Unknown error'}`, { variant: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Employees</h2>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-sm">Add New Employee</h3>
          <AddEmployeeForm onAdd={handleAdd} loading={loading} appId={appId} />
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h3 className="card-title text-sm">Employee Registry ({employees.length})</h3>
          <EmployeeList
            employees={employees}
            onRemove={handleRemove}
            onUpdateSalary={onUpdateSalary}
            loading={loading}
            employeeMeta={employeeMeta}
          />
        </div>
      </div>

      {/* Allocation Summary */}
      {employees.filter(e => e.isActive).length > 0 && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-sm">Token Allocations</h3>
            <p className="text-xs opacity-40 mb-3">Employee-configured salary splits</p>
            <div className="overflow-x-auto">
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
                  {employees.filter(e => e.isActive).map(emp => {
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
        </div>
      )}
    </div>
  )
}

export default Employees
