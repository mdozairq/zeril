import { useEffect, useState } from 'react'
import { useSnackbar } from 'notistack'
import { custodyApi } from '../../services/api'
import { microUnitsToUsdc } from '../../utils/formatUsdc'

export default function CustodyWidget({ appId }: { appId: string }) {
  const { enqueueSnackbar } = useSnackbar()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof custodyApi.get>> | null>(null)

  const refresh = async () => {
    if (!appId) return
    setLoading(true)
    try {
      const res = await custodyApi.get(appId)
      setSummary(res)
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to load custody', { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId])

  const principal = summary ? BigInt(summary.principal) : 0n
  const yieldAmt = summary ? BigInt(summary.accruedYield) : 0n

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase opacity-40">Treasury</div>
          <div className="text-sm font-semibold">Custody</div>
        </div>
        <button className="btn btn-ghost btn-xs" onClick={refresh} disabled={loading}>
          {loading ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] opacity-40">Principal</div>
          <div className="font-mono text-sm">${microUnitsToUsdc(principal)}</div>
        </div>
        <div>
          <div className="text-[10px] opacity-40">Accrued yield</div>
          <div className="font-mono text-sm">${microUnitsToUsdc(yieldAmt)}</div>
        </div>
        <div>
          <div className="text-[10px] opacity-40">APR</div>
          <div className="font-mono text-sm">{summary ? (Number(summary.aprBps) / 100).toFixed(2) : '—'}%</div>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <input
          className="input input-bordered input-sm flex-1 font-mono"
          placeholder="Amount (USDC micro-units)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
        />
        <button
          className="btn btn-primary btn-sm"
          disabled={loading || !amount.trim()}
          onClick={async () => {
            setLoading(true)
            try {
              await custodyApi.deposit({ companyAppId: appId, amountUsdcMicrounits: amount.trim() })
              setAmount('')
              await refresh()
              enqueueSnackbar('Deposit recorded (sandbox)', { variant: 'success' })
            } catch (e) {
              enqueueSnackbar(e instanceof Error ? e.message : 'Deposit failed', { variant: 'error' })
            } finally {
              setLoading(false)
            }
          }}
        >
          Deposit
        </button>
        <button
          className="btn btn-ghost btn-sm"
          disabled={loading || !amount.trim()}
          onClick={async () => {
            setLoading(true)
            try {
              await custodyApi.withdraw({ companyAppId: appId, amountUsdcMicrounits: amount.trim() })
              setAmount('')
              await refresh()
              enqueueSnackbar('Withdraw recorded (sandbox)', { variant: 'success' })
            } catch (e) {
              enqueueSnackbar(e instanceof Error ? e.message : 'Withdraw failed', { variant: 'error' })
            } finally {
              setLoading(false)
            }
          }}
        >
          Withdraw
        </button>
      </div>

      <div className="text-[10px] opacity-40">
        Yield is computed off-chain from event timestamps (APR pro-rata).
      </div>
    </div>
  )
}

