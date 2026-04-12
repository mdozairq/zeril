import { useWallet } from '@txnlab/use-wallet-react'
import { useState, useEffect } from 'react'
import ConnectWallet from './components/ConnectWallet'
import Landing from './pages/Landing'
import RoleSelection from './pages/RoleSelection'
import CompanyDashboard from './pages/CompanyDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'

type AppRole = 'company' | 'employee' | null
type AppView = 'landing' | 'role-select' | 'app'

const ROLE_KEY = 'zeril_role'

const Home = () => {
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [role, setRole] = useState<AppRole>(() => {
    return (localStorage.getItem(ROLE_KEY) as AppRole) || null
  })
  const [view, setView] = useState<AppView>('landing')
  const { activeAddress } = useWallet()

  // When wallet connects and we have a role, move to app view
  useEffect(() => {
    if (activeAddress && role && view === 'role-select') {
      setView('app')
    }
  }, [activeAddress, role, view])

  // If user had a persisted role + is already connected, go straight to app
  useEffect(() => {
    if (activeAddress && role && view === 'landing') {
      setView('app')
    }
  }, [activeAddress, role, view])

  const handleSelectRole = (selectedRole: AppRole) => {
    setRole(selectedRole)
    if (selectedRole) localStorage.setItem(ROLE_KEY, selectedRole)
    setOpenWalletModal(true)
  }

  const handleLaunchApp = () => {
    if (activeAddress && role) {
      setView('app')
      return
    }
    setView('role-select')
  }

  const handleBackToLanding = () => {
    setView('landing')
    setRole(null)
    localStorage.removeItem(ROLE_KEY)
  }

  // ─── LANDING ───
  if (view === 'landing') {
    return (
      <>
        <Landing onLaunchApp={handleLaunchApp} />
        <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
      </>
    )
  }

  // ─── ROLE SELECTION ───
  if (view === 'role-select') {
    return (
      <>
        <RoleSelection
          onSelectRole={handleSelectRole}
          onBack={handleBackToLanding}
          selectedRole={role}
        />
        <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
      </>
    )
  }

  // ─── APP VIEW ───
  if (!role) {
    setView('role-select')
    return null
  }

  // Employee view
  if (role === 'employee') {
    return (
      <>
        <EmployeeDashboard onBack={handleBackToLanding} onConnectWallet={() => setOpenWalletModal(true)} />
        <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
      </>
    )
  }

  // Company view — single page, no sidebar/tabs
  return (
    <>
      <CompanyDashboard onBack={handleBackToLanding} onConnectWallet={() => setOpenWalletModal(true)} />
      <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
    </>
  )
}

export default Home
