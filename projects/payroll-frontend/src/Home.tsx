import { useState, createContext, useContext, type ReactNode } from 'react'
import ConnectWallet from './components/ConnectWallet'

interface WalletModalContextType {
  openWalletModal: () => void
}

const WalletModalContext = createContext<WalletModalContextType>({
  openWalletModal: () => {},
})

export function useWalletModal() {
  return useContext(WalletModalContext)
}

export function AppShell({ children }: { children: ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <WalletModalContext.Provider value={{ openWalletModal: () => setModalOpen(true) }}>
      {children}
      <ConnectWallet openModal={modalOpen} closeModal={() => setModalOpen(false)} />
    </WalletModalContext.Provider>
  )
}
