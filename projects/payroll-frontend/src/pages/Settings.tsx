import { useState } from 'react'
import { useSnackbar } from 'notistack'
import { PayrollContractState } from '../hooks/usePayrollContract'
import { ellipseAddress } from '../utils/ellipseAddress'

interface SettingsProps {
  contract: PayrollContractState
  loading: boolean
  onDeploy: () => Promise<unknown>
  onConnect: (appId: bigint) => Promise<unknown>
  onInitialize: (usdcAssetId: bigint) => Promise<void>
  onBootstrap: () => Promise<void>
  usdcAssetId: bigint
}

const Settings = ({
  contract,
  loading,
  onDeploy,
  onConnect,
  onInitialize,
  onBootstrap,
  usdcAssetId,
}: SettingsProps) => {
  const { enqueueSnackbar } = useSnackbar()
  const [existingAppId, setExistingAppId] = useState('')
  const [usdcInput, setUsdcInput] = useState(usdcAssetId > 0n ? usdcAssetId.toString() : '')

  const hasContract = contract.appId !== null
  const step = !hasContract ? 1 : !contract.isInitialized ? 2 : !contract.isBootstrapped ? 3 : 4

  const handleDeploy = async () => {
    try {
      await onDeploy()
      enqueueSnackbar('Contract deployed! Now initialize it with a USDC asset ID.', { variant: 'success' })
    } catch (e: unknown) {
      enqueueSnackbar(`Deploy failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { variant: 'error' })
    }
  }

  const handleConnect = async () => {
    try {
      await onConnect(BigInt(existingAppId))
      enqueueSnackbar('Connected to contract', { variant: 'success' })
    } catch (e: unknown) {
      enqueueSnackbar(`Connect failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { variant: 'error' })
    }
  }

  const handleInitialize = async () => {
    try {
      const assetId = BigInt(usdcInput)
      await onInitialize(assetId)
      enqueueSnackbar('Contract initialized! Now bootstrap it to opt into USDC.', { variant: 'success' })
    } catch (e: unknown) {
      enqueueSnackbar(`Initialize failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { variant: 'error' })
    }
  }

  const handleBootstrap = async () => {
    try {
      await onBootstrap()
      enqueueSnackbar('Contract bootstrapped! You can now use Dashboard, Employees, and Run Payroll.', { variant: 'success' })
    } catch (e: unknown) {
      enqueueSnackbar(`Bootstrap failed: ${e instanceof Error ? e.message : 'Unknown error'}`, { variant: 'error' })
    }
  }

  const stepClass = (s: number) =>
    s < step ? 'step step-primary' : s === step ? 'step step-primary' : 'step'

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Setup Progress */}
      <ul className="steps steps-horizontal w-full">
        <li className={stepClass(1)}>Deploy</li>
        <li className={stepClass(2)}>Initialize</li>
        <li className={stepClass(3)}>Bootstrap</li>
        <li className={stepClass(4)}>Ready</li>
      </ul>

      {/* Current Contract Status */}
      {hasContract && (
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="card-title text-sm">Current Contract</h3>
            <div className="text-sm space-y-1">
              <div><span className="text-base-content/60">App ID:</span> {contract.appId!.toString()}</div>
              <div><span className="text-base-content/60">Address:</span> <span className="font-mono text-xs">{ellipseAddress(contract.appAddress ?? '', 10)}</span></div>
              <div className="flex gap-2 mt-2">
                <span className={`badge badge-sm ${contract.isInitialized ? 'badge-success' : 'badge-warning'}`}>
                  {contract.isInitialized ? 'Initialized' : 'Not Initialized'}
                </span>
                <span className={`badge badge-sm ${contract.isBootstrapped ? 'badge-success' : 'badge-warning'}`}>
                  {contract.isBootstrapped ? 'Bootstrapped' : 'Not Bootstrapped'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Deploy or Connect */}
      <div className={`card bg-base-100 shadow ${step !== 1 && !hasContract ? 'opacity-50' : ''}`}>
        <div className="card-body">
          <h3 className="card-title text-sm">Step 1: Deploy or Connect Contract</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-base-content/60 mb-2">
                Deploy a new Employer payroll contract.
              </p>
              <button className="btn btn-primary btn-sm" onClick={handleDeploy} disabled={loading || hasContract}>
                {loading ? <span className="loading loading-spinner loading-xs" /> : hasContract ? 'Deployed' : 'Deploy Contract'}
              </button>
            </div>

            <div>
              <p className="text-sm text-base-content/60 mb-2">
                Or connect to an existing contract.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="App ID"
                  className="input input-bordered input-sm flex-1"
                  value={existingAppId}
                  onChange={(e) => setExistingAppId(e.target.value)}
                />
                <button className="btn btn-sm btn-outline" onClick={handleConnect} disabled={loading || !existingAppId}>
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Initialize */}
      <div className={`card bg-base-100 shadow ${step < 2 ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="card-body">
          <h3 className="card-title text-sm">Step 2: Initialize with USDC Asset</h3>
          <p className="text-sm text-base-content/60">
            Set the USDC asset ID. This can only be called once and sets you as the employer.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="USDC Asset ID"
              className="input input-bordered input-sm flex-1"
              value={usdcInput}
              onChange={(e) => setUsdcInput(e.target.value)}
              disabled={contract.isInitialized}
            />
            <button
              className="btn btn-sm btn-primary"
              onClick={handleInitialize}
              disabled={loading || !usdcInput || !hasContract || contract.isInitialized}
            >
              {loading ? <span className="loading loading-spinner loading-xs" /> : contract.isInitialized ? 'Initialized' : 'Initialize'}
            </button>
          </div>
        </div>
      </div>

      {/* Step 3: Bootstrap */}
      <div className={`card bg-base-100 shadow ${step < 3 ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="card-body">
          <h3 className="card-title text-sm">Step 3: Bootstrap (Opt into USDC)</h3>
          <p className="text-sm text-base-content/60">
            Opt the contract into the USDC ASA so it can receive and send USDC payments.
          </p>
          <button
            className="btn btn-sm btn-primary"
            onClick={handleBootstrap}
            disabled={loading || !contract.isInitialized || contract.isBootstrapped}
          >
            {loading ? <span className="loading loading-spinner loading-xs" /> : contract.isBootstrapped ? 'Bootstrapped' : 'Bootstrap'}
          </button>
        </div>
      </div>

      {/* Ready */}
      {step === 4 && (
        <div className="alert alert-success">
          Contract is fully set up! Navigate to Dashboard, Employees, or Run Payroll using the sidebar.
        </div>
      )}
    </div>
  )
}

export default Settings
