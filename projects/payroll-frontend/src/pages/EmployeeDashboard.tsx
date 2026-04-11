import { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useEmployeeView } from '../hooks/useEmployeeView'
import { ellipseAddress } from '../utils/ellipseAddress'
import { formatUsdcDisplay, microUnitsToUsdc } from '../utils/formatUsdc'
import TokenAllocation from '../components/Employee/TokenAllocation'
import { loadAllocation } from '../utils/tokenAllocation'
import { getAlgoUsdcPrice } from '../utils/tinyman'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface PaymentRecord {
  id: string
  round: number
  timestamp: string
  amount: bigint
  type: 'usdc' | 'algo'
}

interface EmployeeDashboardProps {
  onBack: () => void
  onConnectWallet: () => void
}

export default function EmployeeDashboard({ onBack, onConnectWallet }: EmployeeDashboardProps) {
  const { activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const employeeView = useEmployeeView()
  const [appIdInput, setAppIdInput] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'allocation' | 'records'>('overview')
  const [algoPrice, setAlgoPrice] = useState<number>(0)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const network = getAlgodConfigFromViteEnvironment().network
  const explorerBase = network === 'mainnet'
    ? 'https://explorer.perawallet.app'
    : 'https://testnet.explorer.perawallet.app'

  const handleConnect = async () => {
    if (!appIdInput) return
    try {
      await employeeView.connectToCompany(BigInt(appIdInput))
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to connect', { variant: 'error' })
    }
  }

  const fetchPrice = async () => {
    setLoadingPrice(true)
    try {
      const price = await getAlgoUsdcPrice(network)
      setAlgoPrice(price)
    } catch {
      enqueueSnackbar('Failed to fetch ALGO price', { variant: 'error' })
    } finally {
      setLoadingPrice(false)
    }
  }

  // Fetch payment history from indexer when connected
  useEffect(() => {
    if (!employeeView.connected || !activeAddress || !employeeView.appAddress) return

    const fetchHistory = async () => {
      setLoadingHistory(true)
      try {
        const indexerConfig = getIndexerConfigFromViteEnvironment()
        const baseUrl = `${indexerConfig.server}${indexerConfig.port ? ':' + indexerConfig.port : ''}`
        const res = await fetch(
          `${baseUrl}/v2/accounts/${activeAddress}/transactions?address-role=receiver&limit=20`
        )
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        const records: PaymentRecord[] = []
        for (const txn of data.transactions || []) {
          // Filter only txns from the contract address
          if (txn.sender !== employeeView.appAddress) continue

          if (txn['tx-type'] === 'pay' && txn['payment-transaction']) {
            records.push({
              id: txn.id,
              round: txn['confirmed-round'],
              timestamp: new Date(txn['round-time'] * 1000).toISOString(),
              amount: BigInt(txn['payment-transaction'].amount),
              type: 'algo',
            })
          } else if (txn['tx-type'] === 'axfer' && txn['asset-transfer-transaction']) {
            records.push({
              id: txn.id,
              round: txn['confirmed-round'],
              timestamp: new Date(txn['round-time'] * 1000).toISOString(),
              amount: BigInt(txn['asset-transfer-transaction'].amount),
              type: 'usdc',
            })
          }
        }

        setPaymentHistory(records.sort((a, b) => b.round - a.round))
      } catch {
        setPaymentHistory([])
      } finally {
        setLoadingHistory(false)
      }
    }

    fetchHistory()
  }, [employeeView.connected, activeAddress, employeeView.appAddress])

  if (!activeAddress) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
        <div className="flex flex-col items-center mb-8">
          <span className="font-serif italic text-[48px] leading-none">Z</span>
          <span className="font-mono text-[8px] tracking-[0.3em] uppercase -mt-1" style={{ color: 'rgba(250,250,247,0.4)' }}>eril</span>
        </div>
        <h2 className="text-2xl font-light mb-4">Connect Your Wallet</h2>
        <p className="text-sm mb-8 text-center max-w-sm" style={{ color: 'rgba(250,250,247,0.45)' }}>
          Connect your Algorand wallet to view your payroll details and configure token allocation.
        </p>
        <button onClick={onConnectWallet} className="btn btn-primary btn-sm px-8">
          Connect Wallet
        </button>
        <button onClick={onBack} className="mt-4 text-xs opacity-40 hover:opacity-60">&larr; Back</button>
      </div>
    )
  }

  if (!employeeView.connected) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'rgba(250,250,247,0.08)' }}>
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-xs opacity-40 hover:opacity-60">&larr;</button>
            <div className="flex flex-col">
              <span className="font-serif italic text-lg leading-none">Z</span>
              <span className="font-mono text-[6px] tracking-[0.3em] uppercase -mt-0.5 opacity-40">eril</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono rounded" style={{ backgroundColor: 'rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.5)', border: '1px solid rgba(250,250,247,0.08)' }}>{network}</span>
            <span className="font-mono text-xs" style={{ color: 'rgba(250,250,247,0.5)' }}>{ellipseAddress(activeAddress)}</span>
          </div>
        </div>

        <div className="max-w-md mx-auto mt-24 px-6">
          <h2 className="text-xl font-light mb-2">Connect to Company</h2>
          <p className="text-xs mb-6" style={{ color: 'rgba(250,250,247,0.45)' }}>
            Enter the payroll contract App ID shared by your employer.
          </p>

          {employeeView.error && (
            <div className="mb-4 p-3 rounded text-xs" style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
              {employeeView.error}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Contract App ID"
              className="input input-bordered input-sm flex-1"
              value={appIdInput}
              onChange={(e) => setAppIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
            <button
              onClick={handleConnect}
              disabled={employeeView.loading || !appIdInput}
              className="btn btn-primary btn-sm"
            >
              {employeeView.loading ? <span className="loading loading-spinner loading-xs" /> : 'Connect'}
            </button>
          </div>

          <div className="mt-8 p-4 rounded-xl text-xs" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="font-semibold mb-2">How to connect:</div>
            <ol className="space-y-1 list-decimal list-inside" style={{ color: 'rgba(250,250,247,0.5)' }}>
              <li>Ask your employer for the payroll App ID</li>
              <li>Enter it above and click Connect</li>
              <li>View your salary and configure allocation</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  const allocation = activeAddress ? loadAllocation(activeAddress) : null
  const algoAlloc = allocation?.allocations.find(a => a.token === 'ALGO')
  const algoPercentage = algoAlloc?.percentage ?? 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'rgba(250,250,247,0.08)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-xs opacity-40 hover:opacity-60">&larr;</button>
          <div className="flex flex-col">
            <span className="font-serif italic text-lg leading-none">Z</span>
            <span className="font-mono text-[6px] tracking-[0.3em] uppercase -mt-0.5 opacity-40">eril</span>
          </div>
          {employeeView.companyMeta && (
            <span className="text-xs opacity-40 ml-2">{employeeView.companyMeta.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-mono rounded" style={{ backgroundColor: 'rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.5)', border: '1px solid rgba(250,250,247,0.08)' }}>{network}</span>
          <span className="font-mono text-xs" style={{ color: 'rgba(250,250,247,0.5)' }}>{ellipseAddress(activeAddress)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b px-6 flex gap-0" style={{ borderColor: 'rgba(250,250,247,0.08)' }}>
        {(['overview', 'allocation', 'records'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-3 text-xs font-medium tracking-wider uppercase transition-colors"
            style={{
              color: activeTab === tab ? '#FAFAF7' : 'rgba(250,250,247,0.35)',
              borderBottom: activeTab === tab ? '2px solid #FAFAF7' : '2px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Wallet Card */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>
                  Your Wallet · {employeeView.companyMeta?.name || 'Payroll'}
                </div>
                <a
                  href={`${explorerBase}/address/${activeAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono opacity-30 hover:opacity-60"
                >
                  View on Explorer ↗
                </a>
              </div>
              <div className="font-mono text-xs break-all" style={{ color: 'rgba(250,250,247,0.5)' }}>{activeAddress}</div>
            </div>

            {/* Salary & Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
                <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>Monthly Salary</div>
                <div className="text-2xl font-bold">{formatUsdcDisplay(employeeView.salary)}</div>
              </div>
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
                <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>Status</div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${employeeView.isActive ? 'bg-success' : 'bg-error'}`} />
                  <span className="text-sm font-medium">{employeeView.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
                <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>USDC Opt-in</div>
                <span className={`badge badge-sm ${employeeView.optedIntoUsdc ? 'badge-success' : 'badge-warning'}`}>
                  {employeeView.optedIntoUsdc ? 'Opted In' : 'Not Opted In'}
                </span>
              </div>
            </div>

            {/* Contract Details */}
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
              <h3 className="text-sm font-semibold mb-3">Contract Details</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span style={{ color: 'rgba(250,250,247,0.4)' }}>App ID</span>
                  <a href={`${explorerBase}/application/${employeeView.appId}`} target="_blank" rel="noopener noreferrer" className="font-mono hover:opacity-70">
                    {employeeView.appId?.toString()} ↗
                  </a>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgba(250,250,247,0.4)' }}>Contract Address</span>
                  <span className="font-mono">{ellipseAddress(employeeView.appAddress ?? '', 10)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgba(250,250,247,0.4)' }}>Last Paid</span>
                  <span className="font-mono">{employeeView.lastPaidRound > 0n ? `Round ${employeeView.lastPaidRound}` : 'Never'}</span>
                </div>
                {employeeView.companyMeta && (
                  <div className="flex justify-between">
                    <span style={{ color: 'rgba(250,250,247,0.4)' }}>Company</span>
                    <span>{employeeView.companyMeta.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Allocation Preview with Price */}
            {allocation && allocation.allocations.length > 0 && (
              <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Payout Splits</div>
                    <h3 className="text-sm font-semibold">Your Allocation</h3>
                  </div>
                  <button onClick={fetchPrice} disabled={loadingPrice} className="btn btn-ghost btn-xs text-xs">
                    {loadingPrice ? <span className="loading loading-spinner loading-xs" /> : 'Fetch Prices'}
                  </button>
                </div>
                <div className="space-y-3">
                  {allocation.allocations.map((a, i) => {
                    const isUsdc = a.token === 'USDC'
                    const dollarValue = isUsdc
                      ? microUnitsToUsdc(BigInt(Math.round(Number(employeeView.salary) * a.percentage / 100)))
                      : algoPrice > 0
                        ? (Number(employeeView.salary) / 1_000_000 * a.percentage / 100 / algoPrice).toFixed(2)
                        : null
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                              style={{
                                backgroundColor: isUsdc ? 'rgba(74,222,128,0.15)' : 'rgba(250,250,247,0.08)',
                                color: isUsdc ? '#4ADE80' : '#FAFAF7',
                              }}>
                              {isUsdc ? '$' : 'A'}
                            </div>
                            <div>
                              <span className="font-mono text-sm">{a.token}</span>
                              <span className="text-xs opacity-40 ml-2">{a.percentage}%</span>
                            </div>
                          </div>
                          <span className="font-mono text-sm font-bold">
                            {isUsdc ? `$${dollarValue}` : dollarValue ? `~${dollarValue} ALGO` : '—'}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.06)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${a.percentage}%`,
                              backgroundColor: isUsdc ? 'rgba(74,222,128,0.5)' : 'rgba(250,250,247,0.3)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {algoPrice > 0 && (
                  <div className="mt-4 pt-3 text-[10px] font-mono" style={{ borderTop: '1px solid rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.3)' }}>
                    ALGO/USDC: ${algoPrice.toFixed(4)} (Tinyman {network})
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'allocation' && activeAddress && employeeView.appId !== null && (
          <div className="max-w-lg">
            <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
              <TokenAllocation
                walletAddress={activeAddress}
                appId={employeeView.appId.toString()}
                onSaveOnChain={employeeView.setOnChainAllocation}
              />
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
                <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>History</div>
                <div className="text-sm font-semibold">Payment Records</div>
              </div>

              {loadingHistory ? (
                <div className="p-8 flex justify-center">
                  <span className="loading loading-spinner loading-sm opacity-40" />
                </div>
              ) : paymentHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(250,250,247,0.06)' }}>
                        <th className="text-left px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Date</th>
                        <th className="text-left px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Type</th>
                        <th className="text-right px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Amount</th>
                        <th className="text-right px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Round</th>
                        <th className="text-right px-5 py-3 text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map(record => (
                        <tr key={record.id} style={{ borderBottom: '1px solid rgba(250,250,247,0.04)' }}>
                          <td className="px-5 py-3 text-xs font-mono">
                            {new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${record.type === 'usdc' ? 'text-success' : ''}`}
                              style={record.type === 'usdc'
                                ? { backgroundColor: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }
                                : { backgroundColor: 'rgba(250,250,247,0.06)', border: '1px solid rgba(250,250,247,0.1)' }
                              }>
                              {record.type === 'usdc' ? 'USDC' : 'ALGO'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs font-bold">
                            {record.type === 'usdc'
                              ? `$${microUnitsToUsdc(record.amount)}`
                              : `${(Number(record.amount) / 1_000_000).toFixed(4)} ALGO`
                            }
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs opacity-40">
                            {record.round}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <a
                              href={`${explorerBase}/tx/${record.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10px] opacity-40 hover:opacity-70 transition-opacity"
                            >
                              {record.id.slice(0, 8)}... ↗
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm opacity-40">
                    {employeeView.lastPaidRound > 0n
                      ? 'No recent payment records found from this contract.'
                      : 'No payroll payments received yet.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
