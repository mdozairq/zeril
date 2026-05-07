import { useWallet } from '@txnlab/use-wallet-react'
import { useEmployee } from '../../contexts/EmployeeContext'
import { ellipseAddress } from '../../utils/ellipseAddress'
import { formatUsdcDisplay, microUnitsToUsdc } from '../../utils/formatUsdc'
import { useSnackbar } from 'notistack'
import { useState, useEffect, useMemo } from 'react'
import { employeeApi, type EmployeeMetaData } from '../../services/api'
import BankDetailsForm from '../../components/Employee/BankDetailsForm'
import EmployeeOnboardingChecklist from '../../components/Employee/EmployeeOnboardingChecklist'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { EmployerClient } from '../../contracts/Employer'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'

export default function EmployeeOverview() {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress, transactionSigner } = useWallet()
  const {
    salary, isActive, optedIntoUsdc, lastPaidRound,
    appId, appAddress, companyMeta,
    explorerBase, allocation, algoPrice, loadingPrice, fetchPrice, network,
  } = useEmployee()

  const [receiver, setReceiver] = useState('')
  const [savingPref, setSavingPref] = useState(false)
  const [payoutMethod, setPayoutMethod] = useState<'crypto' | 'bank'>('crypto')
  const [empMeta, setEmpMeta] = useState<EmployeeMetaData | null>(null)

  const appIdStrLocal = useMemo(() => appId?.toString() ?? '', [appId])

  useEffect(() => {
    if (!activeAddress || !appIdStrLocal) return
    employeeApi.list(appIdStrLocal).then(list => {
      const me = list.find(e => e.walletAddress === activeAddress)
      if (me) {
        setEmpMeta(me)
        if (me.payoutMethod === 'bank' || me.payoutMethod === 'crypto') {
          setPayoutMethod(me.payoutMethod)
        }
      }
    }).catch(() => {})
  }, [activeAddress, appIdStrLocal])

  const savedBankDetails = useMemo<Record<string, string>>(() => {
    if (!empMeta?.bankDetailsJson) return {}
    try { return JSON.parse(empMeta.bankDetailsJson) } catch { return {} }
  }, [empMeta?.bankDetailsJson])

  const setOnChainReceiver = async (addr: string) => {
    if (!activeAddress || !appId) throw new Error('Not connected')
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    algorand.setDefaultSigner(transactionSigner)
    const client = algorand.client.getTypedAppClientById(EmployerClient, {
      appId,
      defaultSender: activeAddress,
    })
    const mbrPayTxn = await algorand.createTransaction.payment({
      sender: activeAddress,
      receiver: client.appAddress,
      amount: (0.1).algo(),
    })
    await client.send.setAlgoReceiver({
      args: { employee: activeAddress, receiver: addr, mbrPay: mbrPayTxn },
      populateAppCallResources: true,
    })
  }

  return (
    <div className="space-y-6">
      {/* Wallet Card */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono tracking-wider uppercase" style={{ color: 'rgba(250,250,247,0.35)' }}>
            Your Wallet · {companyMeta?.name || 'Payroll'}
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

      {appId !== null && (
        <EmployeeOnboardingChecklist appId={appId} />
      )}

      {/* Salary & Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>Monthly Salary</div>
          <div className="text-2xl font-bold">{formatUsdcDisplay(salary)}</div>
        </div>
        <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>Status</div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-success' : 'bg-error'}`} />
            <span className="text-sm font-medium">{isActive ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        <div className="p-5 rounded-xl" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: 'rgba(250,250,247,0.35)' }}>USDC Opt-in</div>
          <span className={`badge badge-sm ${optedIntoUsdc ? 'badge-success' : 'badge-warning'}`}>
            {optedIntoUsdc ? 'Opted In' : 'Not Opted In'}
          </span>
        </div>
      </div>

      {/* Contract Details */}
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <h3 className="text-sm font-semibold mb-3">Contract Details</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span style={{ color: 'rgba(250,250,247,0.4)' }}>App ID</span>
            <a href={`${explorerBase}/application/${appId}`} target="_blank" rel="noopener noreferrer" className="font-mono hover:opacity-70">
              {appId?.toString()} ↗
            </a>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'rgba(250,250,247,0.4)' }}>Contract Address</span>
            <span className="font-mono">{ellipseAddress(appAddress ?? '', 10)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'rgba(250,250,247,0.4)' }}>Last Paid</span>
            <span className="font-mono">{lastPaidRound > 0n ? `Round ${lastPaidRound}` : 'Never'}</span>
          </div>
          {companyMeta && (
            <div className="flex justify-between">
              <span style={{ color: 'rgba(250,250,247,0.4)' }}>Company</span>
              <span>{companyMeta.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Allocation Preview */}
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
                ? microUnitsToUsdc(BigInt(Math.round(Number(salary) * a.percentage / 100)))
                : algoPrice > 0
                  ? (Number(salary) / 1_000_000 * a.percentage / 100 / algoPrice).toFixed(2)
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

      {/* Payout Preferences */}
      {appId !== null && (
        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Payout Preferences</h3>
            <span className="badge badge-sm">{payoutMethod === 'bank' ? 'Bank Transfer' : 'Crypto (Algorand)'}</span>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              className={`btn btn-sm ${payoutMethod === 'crypto' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPayoutMethod('crypto')}
              disabled={savingPref}
            >
              Crypto
            </button>
            <button
              className={`btn btn-sm ${payoutMethod === 'bank' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setPayoutMethod('bank')}
              disabled={savingPref}
            >
              Bank Transfer
            </button>
          </div>

          {payoutMethod === 'crypto' ? (
            <>
              <div className="text-xs opacity-50 mb-3">
                Set an alternate wallet to receive your ALGO portion. USDC continues to go to your connected wallet.
              </div>
              <div className="flex gap-2">
                <input
                  className="input input-bordered input-sm flex-1 font-mono"
                  placeholder="Algorand address (optional)"
                  value={receiver}
                  onChange={(e) => setReceiver(e.target.value)}
                  disabled={savingPref}
                />
                <button
                  className="btn btn-primary btn-sm"
                  disabled={savingPref || !activeAddress}
                  onClick={async () => {
                    if (!activeAddress) return
                    setSavingPref(true)
                    try {
                      await employeeApi.setPayoutPreference(appId.toString(), activeAddress, {
                        payoutMethod: 'crypto',
                        cryptoNetwork: 'algorand',
                        cryptoAddress: receiver.trim() || activeAddress,
                      })
                      if (receiver.trim()) {
                        await setOnChainReceiver(receiver.trim())
                      }
                      enqueueSnackbar('Payout preference saved: Crypto', { variant: 'success' })
                    } catch (e) {
                      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to save', { variant: 'error' })
                    } finally {
                      setSavingPref(false)
                    }
                  }}
                >
                  {savingPref ? <span className="loading loading-spinner loading-xs" /> : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs opacity-50 mb-3">
                Payments will be bridged off-chain via Wormhole + Saber to your bank account.
              </div>
              <BankDetailsForm
                countryCode={empMeta?.country ?? null}
                initialValues={savedBankDetails}
                disabled={savingPref}
                onSave={async (bankDetails) => {
                  if (!activeAddress) return
                  setSavingPref(true)
                  try {
                    await employeeApi.setPayoutPreference(appId.toString(), activeAddress, {
                      payoutMethod: 'bank',
                      bankDetailsJson: JSON.stringify(bankDetails),
                    })
                    enqueueSnackbar('Bank details saved', { variant: 'success' })
                  } catch (e) {
                    enqueueSnackbar(e instanceof Error ? e.message : 'Failed to save', { variant: 'error' })
                  } finally {
                    setSavingPref(false)
                  }
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
