import { Employee } from '../../hooks/useEmployees'
import { ellipseAddress } from '../../utils/ellipseAddress'
import { formatUsdcDisplay, microUnitsToUsdc } from '../../utils/formatUsdc'

interface PayrollPreviewProps {
  employees: Employee[]
  contractBalance: bigint
  onExecute: () => void
  loading: boolean
}

const PayrollPreview = ({ employees, contractBalance, onExecute, loading }: PayrollPreviewProps) => {
  const payableEmployees = employees.filter((e) => e.optedIntoUsdc)
  const notOptedIn = employees.filter((e) => !e.optedIntoUsdc)
  const totalPayroll = payableEmployees.reduce((sum, e) => sum + e.salary, 0n)
  const hasSufficientFunds = contractBalance >= totalPayroll
  const canExecute = hasSufficientFunds && payableEmployees.length > 0

  return (
    <div className="space-y-4">
      <div className="stats shadow w-full">
        <div className="stat">
          <div className="stat-title">Employees to Pay</div>
          <div className="stat-value text-lg">{payableEmployees.length}/{employees.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Total Payroll</div>
          <div className="stat-value text-lg">${microUnitsToUsdc(totalPayroll)}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Contract Balance</div>
          <div className={`stat-value text-lg ${!hasSufficientFunds ? 'text-error' : ''}`}>
            ${microUnitsToUsdc(contractBalance)}
          </div>
        </div>
      </div>

      {notOptedIn.length > 0 && (
        <div className="alert alert-warning">
          <div>
            <span className="font-bold">{notOptedIn.length} employee(s) have NOT opted into USDC and will be skipped:</span>
            <ul className="list-disc ml-4 mt-1">
              {notOptedIn.map((emp) => (
                <li key={emp.address} className="font-mono text-xs">{ellipseAddress(emp.address, 8)}</li>
              ))}
            </ul>
            <p className="mt-1 text-xs">Employees must opt into USDC (ASA) in their wallet before they can receive payment.</p>
          </div>
        </div>
      )}

      {!hasSufficientFunds && (
        <div className="alert alert-error">
          Insufficient USDC balance. Please fund the contract before running payroll.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Amount</th>
              <th>USDC Opt-in</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.address} className={!emp.optedIntoUsdc ? 'opacity-50' : ''}>
                <td className="font-mono text-xs">{ellipseAddress(emp.address, 8)}</td>
                <td>{formatUsdcDisplay(emp.salary)}</td>
                <td>
                  <span className={`badge badge-sm ${emp.optedIntoUsdc ? 'badge-success' : 'badge-warning'}`}>
                    {emp.optedIntoUsdc ? 'Ready' : 'Not opted in'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        className={`btn btn-primary w-full ${!canExecute ? 'btn-disabled' : ''}`}
        onClick={onExecute}
        disabled={loading || !canExecute}
      >
        {loading ? <span className="loading loading-spinner" /> : `Execute Payroll ($${microUnitsToUsdc(totalPayroll)} USDC)`}
      </button>
    </div>
  )
}

export default PayrollPreview
