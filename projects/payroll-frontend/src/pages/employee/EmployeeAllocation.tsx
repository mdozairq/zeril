import { useWallet } from '@txnlab/use-wallet-react'
import { useEmployee } from '../../contexts/EmployeeContext'
import TokenAllocation from '../../components/Employee/TokenAllocation'

export default function EmployeeAllocation() {
  const { activeAddress } = useWallet()
  const { appId, setOnChainAllocation } = useEmployee()

  if (!activeAddress || appId === null) {
    return (
      <div className="text-center py-12 text-sm opacity-40">
        Connect to a company first to configure your allocation.
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <TokenAllocation
          walletAddress={activeAddress}
          appId={appId.toString()}
          onSaveOnChain={setOnChainAllocation}
        />
      </div>
    </div>
  )
}
