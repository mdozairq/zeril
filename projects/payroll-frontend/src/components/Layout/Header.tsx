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
    <div className="navbar border-b px-6" style={{ backgroundColor: '#0A0A0A', borderColor: 'rgba(250,250,247,0.06)' }}>
      <div className="flex-1">
        <span className="text-xs" style={{ color: 'rgba(250,250,247,0.4)' }}>Payroll Platform</span>
      </div>
      <div className="flex-none gap-3">
        {activeAddress && (
          <span className="text-[10px] font-mono px-2 py-1 rounded" style={{ backgroundColor: 'rgba(250,250,247,0.05)', color: 'rgba(250,250,247,0.5)' }}>
            {network}
          </span>
        )}
        <button
          className="btn btn-sm btn-ghost font-mono text-xs"
          onClick={onConnectWallet}
          style={{ color: 'rgba(250,250,247,0.7)' }}
        >
          {activeAddress ? ellipseAddress(activeAddress) : 'Connect Wallet'}
        </button>
      </div>
    </div>
  )
}

export default Header
