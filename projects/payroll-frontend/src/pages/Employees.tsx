import { useSnackbar } from 'notistack'
import { usePayroll } from '../contexts/PayrollContext'
import AddEmployeeForm from '../components/Employee/AddEmployeeForm'
import EmployeeList from '../components/Employee/EmployeeList'
import { invitationApi, companyApi } from '../services/api'
import { useWallet } from '@txnlab/use-wallet-react'
import { useState } from 'react'

const Employees = () => {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const {
    employees, employeesLoading, employeeMeta, activeEmployees,
    handleAddEmployee, handleRemoveEmployee, updateSalary,
    refreshEmployees, appIdStr, loading, isReady,
    companyName, network,
  } = usePayroll()

  const handleAdd = async (meta: {
    name: string
    address: string
    salaryMicroUnits: bigint
    network: string
    settlementType: 'crypto' | 'bank'
    bankDetails?: string
  }) => {
    try {
      await handleAddEmployee(meta)
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
        <h3 className="text-sm font-semibold mb-2">Invite Employee</h3>
        <p className="text-xs opacity-40 mb-4">Generate an invitation code (sandbox email is logged in API console).</p>
        <div className="flex gap-2 items-center">
          <input
            className="input input-bordered input-sm flex-1"
            placeholder="employee@email.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button
            className="btn btn-primary btn-sm"
            disabled={loading || !appIdStr || !inviteEmail}
            onClick={async () => {
              try {
                if (activeAddress) {
                  await companyApi.upsert({
                    appId: appIdStr,
                    name: companyName || 'Company',
                    network,
                    treasuryAsset: 'USDC',
                    adminAddress: activeAddress,
                  })
                }
                const res = await invitationApi.create(appIdStr, { email: inviteEmail, actorAddress: activeAddress ?? undefined })
                setInviteCode(res.inviteCode)
                enqueueSnackbar('Invite created', { variant: 'success' })
              } catch (e) {
                enqueueSnackbar(e instanceof Error ? e.message : 'Failed to create invite', { variant: 'error' })
              }
            }}
          >
            Create invite
          </button>
        </div>
        {inviteCode && (
          <div className="mt-3">
            <div className="text-xs opacity-40 mb-1">Invite code (share privately)</div>
            <div className="font-mono text-xs p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.35)', border: '1px solid rgba(250,250,247,0.06)' }}>
              {inviteCode}
            </div>
            <div className="text-[10px] opacity-40 mt-2">Acceptance link: {`${window.location.origin}/invite/${inviteCode}`}</div>
          </div>
        )}
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <h3 className="text-sm font-semibold mb-4">Add New Employee</h3>
        <AddEmployeeForm onAdd={handleAdd} loading={loading} canSubmit={Boolean(appIdStr && isReady)} />
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
