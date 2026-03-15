interface PayrollStatusProps {
  total: number
  completed: number
  failed: string[]
  inProgress: boolean
}

const PayrollStatus = ({ total, completed, failed, inProgress }: PayrollStatusProps) => {
  if (total === 0) return null

  const progress = Math.round((completed / total) * 100)

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span>Processing payroll...</span>
        <span>{completed}/{total} completed</span>
      </div>
      <progress className="progress progress-primary w-full" value={progress} max={100} />

      {failed.length > 0 && (
        <div className="alert alert-error text-sm">
          <div>
            <span className="font-bold">Failed payments:</span>
            <ul className="list-disc ml-4 mt-1">
              {failed.map((addr) => (
                <li key={addr} className="font-mono text-xs">{addr}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!inProgress && completed === total && failed.length === 0 && (
        <div className="alert alert-success">
          Payroll completed successfully! All {total} employees paid.
        </div>
      )}
    </div>
  )
}

export default PayrollStatus
