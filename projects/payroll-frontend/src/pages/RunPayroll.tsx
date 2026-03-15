import { useState, useEffect } from 'react'
import { useSnackbar } from 'notistack'
import { Employee } from '../hooks/useEmployees'
import { PayrollContractState } from '../hooks/usePayrollContract'
import PayrollPreview from '../components/Payroll/PayrollPreview'
import PayrollStatus from '../components/Payroll/PayrollStatus'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'

interface RunPayrollProps {
  contract: PayrollContractState
  employees: Employee[]
  payEmployee: (address: string) => Promise<void>
  getAlgorand: () => AlgorandClient
  usdcAssetId: bigint
  onRefresh: () => void
}

const RunPayroll = ({ contract, employees, payEmployee, getAlgorand, usdcAssetId, onRefresh }: RunPayrollProps) => {
  const { enqueueSnackbar } = useSnackbar()
  const [contractBalance, setContractBalance] = useState<bigint>(0n)
  const [total, setTotal] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [failed, setFailed] = useState<string[]>([])
  const [inProgress, setInProgress] = useState(false)

  const activeEmployees = employees.filter((e) => e.isActive)

  useEffect(() => {
    if (contract.appAddress && usdcAssetId > 0n) {
      const algorand = getAlgorand()
      algorand.account.getInformation(contract.appAddress).then((info) => {
        const holding = info.assets?.find((a) => a.assetId === usdcAssetId)
        setContractBalance(holding?.amount ?? 0n)
      }).catch(() => setContractBalance(0n))
    }
  }, [contract.appAddress, usdcAssetId, getAlgorand])

  const payableEmployees = activeEmployees.filter((e) => e.optedIntoUsdc)

  const executePayroll = async () => {
    setInProgress(true)
    setTotal(payableEmployees.length)
    setCompleted(0)
    setFailed([])

    const failedAddrs: string[] = []
    for (const emp of payableEmployees) {
      try {
        await payEmployee(emp.address)
        setCompleted((c) => c + 1)
      } catch {
        failedAddrs.push(emp.address)
        setFailed((f) => [...f, emp.address])
        setCompleted((c) => c + 1)
      }
    }

    setInProgress(false)
    if (failedAddrs.length === 0) {
      enqueueSnackbar('Payroll executed successfully!', { variant: 'success' })
    } else {
      enqueueSnackbar(`${failedAddrs.length} payment(s) failed`, { variant: 'error' })
    }
    onRefresh()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Run Payroll</h2>

      {total > 0 ? (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <PayrollStatus total={total} completed={completed} failed={failed} inProgress={inProgress} />
          </div>
        </div>
      ) : (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-sm">Payroll Preview</h3>
            <PayrollPreview
              employees={activeEmployees}
              contractBalance={contractBalance}
              onExecute={executePayroll}
              loading={inProgress}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default RunPayroll
