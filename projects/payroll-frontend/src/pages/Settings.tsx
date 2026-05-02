import { useState, useEffect } from 'react'
import { useSnackbar } from 'notistack'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePayroll } from '../contexts/PayrollContext'
import { saveCompany } from '../utils/companyStore'
import { companyApi } from '../services/api'
import { Copy } from 'lucide-react'

const Settings = () => {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress } = useWallet()
  const {
    appId, appAddress, isInitialized, isBootstrapped, loading,
    usdcAssetId, network, employerAddress, appIdStr,
    companyName, setCompanyName,
    handleSetupCompany, handleConnectExisting,
    initialize, bootstrap,
  } = usePayroll()

  const [existingAppId, setExistingAppId] = useState('')
  const [usdcInput, setUsdcInput] = useState(usdcAssetId > 0n ? usdcAssetId.toString() : (network === 'mainnet' ? '31566704' : '10458941'))
  const [localCompanyName, setLocalCompanyName] = useState(companyName)
  const [editingCompanyName, setEditingCompanyName] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)

  useEffect(() => {
    setLocalCompanyName(companyName)
  }, [companyName])

  const hasContract = appId !== null
  const step = !hasContract ? 1 : !isInitialized ? 2 : !isBootstrapped ? 3 : 4

  const companyNameDirty = localCompanyName.trim() !== (companyName || '').trim()
  const canSaveCompanyName = Boolean(appIdStr && localCompanyName.trim() && companyNameDirty)

  const handleSaveCompany = () => {
    if (!canSaveCompanyName) return
    const name = localCompanyName.trim()
    saveCompany(appIdStr, {
      name,
      appId: appIdStr,
      network,
      treasuryAsset: 'USDC',
    })
    setCompanyName(name)
    setLocalCompanyName(name)
    setEditingCompanyName(false)
    enqueueSnackbar('Company info saved', { variant: 'success' })
    if (activeAddress) {
      companyApi
        .upsert({
          appId: appIdStr,
          name,
          network,
          treasuryAsset: 'USDC',
          adminAddress: activeAddress,
        })
        .catch(() => {})
    }
  }

  const handleDeploy = async () => {
    setSetupLoading(true)
    try {
      await handleSetupCompany(localCompanyName || 'My Company', usdcInput)
    } catch {
      // Error handled in context
    } finally {
      setSetupLoading(false)
    }
  }

  const handleConnect = async () => {
    setSetupLoading(true)
    try {
      await handleConnectExisting(existingAppId)
    } catch {
      // Error handled in context
    } finally {
      setSetupLoading(false)
    }
  }

  const handleInitialize = async () => {
    try {
      const assetId = BigInt(usdcInput)
      await initialize(assetId)
      enqueueSnackbar('Contract initialized!', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(`Initialize failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { variant: 'error' })
    }
  }

  const handleBootstrap = async () => {
    try {
      await bootstrap()
      enqueueSnackbar('Contract bootstrapped! You can now use Dashboard, Employees, and Run Payroll.', { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(`Bootstrap failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { variant: 'error' })
    }
  }

  const stepClass = (s: number) =>
    s < step ? 'step step-primary' : s === step ? 'step step-primary' : 'step'

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      enqueueSnackbar(successMessage, { variant: 'success' })
    } catch {
      enqueueSnackbar('Could not copy', { variant: 'error' })
    }
  }

  const CopyIconBtn = ({ label, textToCopy, successMessage }: { label: string; textToCopy: string; successMessage: string }) => (
    <button
      type="button"
      className="btn btn-xs btn-ghost gap-1 shrink-0"
      title={`Copy ${label}`}
      onClick={() => copyText(textToCopy, successMessage)}
    >
      <Copy className="w-3 h-3 opacity-80" />
      Copy
    </button>
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Connected employer wallet — copy for sharing / records */}
      {activeAddress && (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}
        >
          <h3 className="text-sm font-semibold mb-3">Connected wallet</h3>
          <div className="flex flex-wrap items-start gap-2">
            <code
              className="text-xs font-mono break-all flex-1 min-w-0 leading-relaxed"
              style={{ color: 'rgba(250,250,247,0.85)' }}
            >
              {activeAddress}
            </code>
            <CopyIconBtn label="wallet address" textToCopy={activeAddress} successMessage="Wallet address copied" />
          </div>
        </div>
      )}

      {/* Setup Progress */}
      <ul className="steps steps-horizontal w-full">
        <li className={stepClass(1)}>Deploy</li>
        <li className={stepClass(2)}>Initialize</li>
        <li className={stepClass(3)}>Bootstrap</li>
        <li className={stepClass(4)}>Ready</li>
      </ul>

      {/* Company Info */}
      {hasContract && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4">Company Info</h3>
          {editingCompanyName ? (
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Company Name"
                className="input input-bordered input-sm flex-1 min-w-[200px]"
                value={localCompanyName}
                onChange={(e) => setLocalCompanyName(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleSaveCompany}
                disabled={!canSaveCompanyName}
              >
                Save
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setLocalCompanyName(companyName)
                  setEditingCompanyName(false)
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="text-sm font-medium">{companyName || localCompanyName || '—'}</div>
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setEditingCompanyName(true)}>
                Edit
              </button>
            </div>
          )}
          <div className="text-xs mt-3 space-y-1" style={{ color: 'rgba(250,250,247,0.4)' }}>
            <div>Network: <span className="font-mono">{network}</span></div>
            <div>Treasury Asset: <span className="font-mono">USDC</span></div>
          </div>
        </div>
      )}

      {/* Current Contract Status */}
      {hasContract && (
        <div className="rounded-xl p-6" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4">Current Contract</h3>
          <div className="text-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="opacity-40">App ID:</span>{' '}
                <span className="font-mono">{appIdStr}</span>
              </div>
              <CopyIconBtn label="App ID" textToCopy={appIdStr} successMessage="App ID copied" />
            </div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="opacity-40 text-xs mb-0.5">Contract address</div>
                <span className="font-mono text-xs break-all" style={{ color: 'rgba(250,250,247,0.9)' }}>
                  {appAddress ?? '—'}
                </span>
              </div>
              {appAddress ? (
                <CopyIconBtn label="contract address" textToCopy={appAddress} successMessage="Contract address copied" />
              ) : null}
            </div>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="opacity-40 text-xs mb-0.5">Employer on-chain</div>
                <span className="font-mono text-xs break-all" style={{ color: 'rgba(250,250,247,0.9)' }}>
                  {employerAddress ?? '—'}
                </span>
              </div>
              {employerAddress ? (
                <CopyIconBtn label="employer address" textToCopy={employerAddress} successMessage="Employer address copied" />
              ) : null}
            </div>
            <div className="flex gap-2 pt-1">
              <span className={`badge badge-sm ${isInitialized ? 'badge-success' : 'badge-warning'}`}>
                {isInitialized ? 'Initialized' : 'Not Initialized'}
              </span>
              <span className={`badge badge-sm ${isBootstrapped ? 'badge-success' : 'badge-warning'}`}>
                {isBootstrapped ? 'Bootstrapped' : 'Not Bootstrapped'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Deploy or Connect */}
      {hasContract ? (
        <div
          className="rounded-xl p-5 text-sm"
          style={{ backgroundColor: 'rgba(250,250,247,0.02)', border: '1px solid rgba(250,250,247,0.06)' }}
        >
          <span className="opacity-50">
            This wallet already has a contract App ID saved in the browser. See “Current Contract” above. To connect a different app, clear site data for this origin or use another wallet.
          </span>
        </div>
      ) : (
        <div className={`rounded-xl p-6 ${step !== 1 && !hasContract ? 'opacity-50' : ''}`} style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4">Step 1: Deploy or Connect Contract</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-50 mb-2">Deploy a new payroll contract.</p>
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Company Name"
                  className="input input-bordered input-sm w-full"
                  value={localCompanyName}
                  onChange={(e) => setLocalCompanyName(e.target.value)}
                  disabled={hasContract}
                />
                <input
                  type="text"
                  placeholder="USDC Asset ID"
                  className="input input-bordered input-sm w-full"
                  value={usdcInput}
                  onChange={(e) => setUsdcInput(e.target.value)}
                  disabled={hasContract}
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleDeploy} disabled={loading || setupLoading || hasContract}>
                {setupLoading ? <span className="loading loading-spinner loading-xs" /> : hasContract ? 'Deployed' : 'Deploy & Setup'}
              </button>
            </div>
            <div>
              <p className="text-sm opacity-50 mb-2">Or connect to an existing contract.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="App ID"
                  className="input input-bordered input-sm flex-1"
                  value={existingAppId}
                  onChange={(e) => setExistingAppId(e.target.value)}
                />
                <button className="btn btn-sm btn-outline" onClick={handleConnect} disabled={loading || setupLoading || !existingAppId}>
                  {setupLoading ? <span className="loading loading-spinner loading-xs" /> : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Initialize */}
      <div className={`rounded-xl p-6 ${step < 2 ? 'opacity-50 pointer-events-none' : ''}`} style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <h3 className="text-sm font-semibold mb-4">Step 2: Initialize with USDC Asset</h3>
        <p className="text-sm opacity-50 mb-3">Set the USDC asset ID. This sets you as the employer.</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="USDC Asset ID"
            className="input input-bordered input-sm flex-1"
            value={usdcInput}
            onChange={(e) => setUsdcInput(e.target.value)}
            disabled={isInitialized}
          />
          <button
            className="btn btn-sm btn-primary"
            onClick={handleInitialize}
            disabled={loading || !usdcInput || !hasContract || isInitialized}
          >
            {loading ? <span className="loading loading-spinner loading-xs" /> : isInitialized ? 'Initialized' : 'Initialize'}
          </button>
        </div>
      </div>

      {/* Step 3: Bootstrap */}
      <div className={`rounded-xl p-6 ${step < 3 ? 'opacity-50 pointer-events-none' : ''}`} style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.08)' }}>
        <h3 className="text-sm font-semibold mb-4">Step 3: Bootstrap (Opt into USDC)</h3>
        <p className="text-sm opacity-50 mb-3">Opt the contract into USDC ASA for payments.</p>
        <button
          className="btn btn-sm btn-primary"
          onClick={handleBootstrap}
          disabled={loading || !isInitialized || isBootstrapped}
        >
          {loading ? <span className="loading loading-spinner loading-xs" /> : isBootstrapped ? 'Bootstrapped' : 'Bootstrap'}
        </button>
      </div>

      {step === 4 && (
        <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
          <div className="text-success text-sm font-semibold">Contract is fully set up!</div>
          <p className="text-xs opacity-50 mt-1">Navigate to Dashboard, Employees, or Run Payroll from the sidebar.</p>
        </div>
      )}

      {/* Share App ID */}
      {hasContract && (
        <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.02)', border: '1px dashed rgba(250,250,247,0.08)' }}>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-3 text-center" style={{ color: 'rgba(250,250,247,0.3)' }}>
            Share with employees
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="font-mono text-lg font-bold break-all text-center">{appIdStr}</div>
            <CopyIconBtn label="App ID" textToCopy={appIdStr} successMessage="App ID copied" />
          </div>
          <p className="text-xs mt-3 text-center" style={{ color: 'rgba(250,250,247,0.3)' }}>
            Employees use this App ID to connect and configure their token allocation.
          </p>
        </div>
      )}
    </div>
  )
}

export default Settings
