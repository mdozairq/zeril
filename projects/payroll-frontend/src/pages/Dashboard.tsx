import { useEffect, useState } from 'react'
import { PayrollContractState } from '../hooks/usePayrollContract'
import { Employee } from '../hooks/useEmployees'
import { microUnitsToUsdc, formatUsdcDisplay } from '../utils/formatUsdc'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { ellipseAddress } from '../utils/ellipseAddress'

interface DashboardProps {
  contract: PayrollContractState
  employees: Employee[]
  getAlgorand: () => AlgorandClient
  usdcAssetId: bigint
}

const Dashboard = ({ contract, employees, getAlgorand, usdcAssetId }: DashboardProps) => {
  const [contractBalance, setContractBalance] = useState<bigint>(0n)
  const activeCount = employees.filter((e) => e.isActive).length
  const totalMonthlyPayroll = employees.filter((e) => e.isActive).reduce((sum, e) => sum + e.salary, 0n)

  useEffect(() => {
    if (contract.appAddress && usdcAssetId > 0n) {
      const algorand = getAlgorand()
      algorand.account.getInformation(contract.appAddress).then((info) => {
        const holding = info.assets?.find((a) => a.assetId === usdcAssetId)
        setContractBalance(holding?.amount ?? 0n)
      }).catch(() => setContractBalance(0n))
    }
  }, [contract.appAddress, usdcAssetId, getAlgorand])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="stats shadow w-full">
        <div className="stat">
          <div className="stat-title">Contract USDC Balance</div>
          <div className="stat-value text-primary">${microUnitsToUsdc(contractBalance)}</div>
          <div className="stat-desc">Available for payroll</div>
        </div>
        <div className="stat">
          <div className="stat-title">Active Employees</div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-desc">{employees.length} total registered</div>
        </div>
        <div className="stat">
          <div className="stat-title">Monthly Payroll</div>
          <div className="stat-value text-lg">{formatUsdcDisplay(totalMonthlyPayroll)}</div>
          <div className="stat-desc">Total for active employees</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-sm">Contract Info</h3>
            <div className="text-sm space-y-1">
              <div><span className="text-base-content/60">App ID:</span> {contract.appId?.toString()}</div>
              <div><span className="text-base-content/60">Address:</span> <span className="font-mono text-xs">{ellipseAddress(contract.appAddress ?? '', 10)}</span></div>
              <div><span className="text-base-content/60">USDC Asset:</span> {usdcAssetId.toString()}</div>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-sm">Quick Actions</h3>
            <div className="text-sm text-base-content/60">
              {contractBalance < totalMonthlyPayroll ? (
                <div className="alert alert-warning text-xs">
                  Contract balance is less than monthly payroll. Please fund the contract.
                </div>
              ) : (
                <p>Contract is funded and ready for payroll.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
