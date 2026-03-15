import { useWallet } from '@txnlab/use-wallet-react'
import { ellipseAddress } from '../../utils/ellipseAddress'
import { getAlgodConfigFromViteEnvironment } from '../../utils/network/getAlgoClientConfigs'

interface HeaderProps {
  onConnectWallet: () => void
}

const Header = ({ onConnectWallet }: HeaderProps) => {
  const { activeAddress } = useWallet()
  const network = getAlgodConfigFromViteEnvironment().network

  return (
    <div className="navbar bg-base-100 border-b">
      <div className="flex-1">
        <span className="text-sm text-base-content/60">Blockchain Payroll Platform</span>
      </div>
      <div className="flex-none gap-2">
        {activeAddress && (
          <div className="badge badge-outline badge-sm">{network}</div>
        )}
        <button className="btn btn-sm btn-primary" onClick={onConnectWallet}>
          {activeAddress ? ellipseAddress(activeAddress) : 'Connect Wallet'}
        </button>
      </div>
    </div>
  )
}

export default Header
