import { useSnackbar } from 'notistack'
import { usePayroll } from '../contexts/PayrollContext'
import AddEmployeeForm, { type AddEmployeeMeta } from '../components/Employee/AddEmployeeForm'
import EmployeeList from '../components/Employee/EmployeeList'
import { employeeApi, type EmployeeMetaData } from '../services/api'
import { useState, useEffect, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

const Employees = () => {
  const { enqueueSnackbar } = useSnackbar()
  const [lastInviteCode, setLastInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [backendMeta, setBackendMeta] = useState<EmployeeMetaData[]>([])
  const {
    employees, employeesLoading, employeeMeta, activeEmployees,
    handleAddEmployee, handleRemoveEmployee, updateSalary,
    refreshEmployees, appIdStr, loading, isReady,
  } = usePayroll()

  const fetchBackendMeta = useCallback(async () => {
    if (!appIdStr) return
    try {
      const list = await employeeApi.list(appIdStr)
      setBackendMeta(list)
    } catch {
      setBackendMeta([])
    }
  }, [appIdStr])

  useEffect(() => { fetchBackendMeta() }, [fetchBackendMeta])

  const handleAdd = async (meta: AddEmployeeMeta) => {
    try {
      const inviteCode = await handleAddEmployee(meta)
      if (inviteCode) {
        setLastInviteCode(inviteCode)
        setCopied(false)
      }
      fetchBackendMeta()
    } catch {
      // Error already shown by context
    }
  }

  const handleRemove = async (address: string) => {
    try {
      await handleRemoveEmployee(address)
      fetchBackendMeta()
    } catch {
      // Error already shown by context
    }
  }

  const handleSalaryUpdate = async (address: string, newSalary: bigint) => {
    try {
      await updateSalary(address, newSalary)
      enqueueSnackbar('Salary updated on-chain', { variant: 'success' })
      refreshEmployees()
    } catch (e) {
      enqueueSnackbar(`Failed: ${e instanceof Error ? e.message : 'Unknown'}`, { variant: 'error' })
    }
  }

  const copyInviteCode = () => {
    if (!lastInviteCode) return
    const link = `${window.location.origin}/invite/${lastInviteCode}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Employees</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => { refreshEmployees(); fetchBackendMeta() }} disabled={employeesLoading}>
          {employeesLoading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
        </button>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <h3 className="text-sm font-semibold mb-4">Add New Employee</h3>
        <AddEmployeeForm onAdd={handleAdd} loading={loading} canSubmit={Boolean(appIdStr && isReady)} />
      </div>

      {lastInviteCode && (
        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.15)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-success">Invite Code Generated</div>
            <button onClick={copyInviteCode} className="btn btn-ghost btn-xs gap-1">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
          <div className="font-mono text-xs p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.35)', border: '1px solid rgba(250,250,247,0.06)' }}>
            {lastInviteCode}
          </div>
          <div className="text-[10px] mt-2" style={{ color: 'rgba(250,250,247,0.4)' }}>
            Share link: {window.location.origin}/invite/{lastInviteCode}
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
          <h3 className="text-sm font-semibold">Employee Registry ({employees.length})</h3>
        </div>
        <div className="p-4">
          <EmployeeList
            employees={employees}
            onRemove={handleRemove}
            onUpdateSalary={handleSalaryUpdate}
            loading={loading}
            employeeMeta={employeeMeta}
            backendMeta={backendMeta}
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
