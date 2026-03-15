import { useWallet } from '@txnlab/use-wallet-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import ConnectWallet from './components/ConnectWallet'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import RunPayroll from './pages/RunPayroll'
import Settings from './pages/Settings'
import { usePayrollContract } from './hooks/usePayrollContract'
import { useEmployees } from './hooks/useEmployees'

const Home = () => {
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [activeTab, setActiveTab] = useState('settings')
  const { activeAddress } = useWallet()

  const payroll = usePayrollContract()
  const { employees, loading: employeesLoading, fetchEmployees } = useEmployees()

  // Use refs to avoid infinite re-render loops from unstable references
  const payrollRef = useRef(payroll)
  payrollRef.current = payroll
  const fetchEmployeesRef = useRef(fetchEmployees)
  fetchEmployeesRef.current = fetchEmployees

  const refreshEmployees = useCallback(() => {
    const { client, usdcAssetId, getAlgorand } = payrollRef.current
    if (client) {
      const algorand = getAlgorand()
      fetchEmployeesRef.current(client, algorand, usdcAssetId)
    }
  }, [])

  // Fetch employees once when client becomes available
  const clientId = payroll.client ? payroll.appId : null
  useEffect(() => {
    if (clientId !== null) {
      refreshEmployees()
    }
  }, [clientId, refreshEmployees])

  // Contract is fully ready when deployed + initialized + bootstrapped
  const isReady = payroll.appId !== null && payroll.isInitialized && payroll.isBootstrapped

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            contract={payroll}
            employees={employees}
            getAlgorand={payroll.getAlgorand}
            usdcAssetId={payroll.usdcAssetId}
          />
        )
      case 'employees':
        return (
          <Employees
            employees={employees}
            loading={payroll.loading || employeesLoading}
            onAddEmployee={payroll.addEmployee}
            onRemoveEmployee={payroll.removeEmployee}
            onUpdateSalary={payroll.updateSalary}
            onRefresh={refreshEmployees}
          />
        )
      case 'payroll':
        return (
          <RunPayroll
            contract={payroll}
            employees={employees}
            payEmployee={payroll.payEmployee}
            getAlgorand={payroll.getAlgorand}
            usdcAssetId={payroll.usdcAssetId}
            onRefresh={refreshEmployees}
          />
        )
      case 'settings':
        return (
          <Settings
            contract={payroll}
            loading={payroll.loading}
            onDeploy={payroll.deploy}
            onConnect={payroll.connectToExisting}
            onInitialize={payroll.initialize}
            onBootstrap={payroll.bootstrap}
            usdcAssetId={payroll.usdcAssetId}
          />
        )
      default:
        return null
    }
  }

  if (!activeAddress) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold">PayRoll</h1>
            <p className="py-6">
              Blockchain-enabled payroll platform on Algorand. Pay employees with USDC stablecoins.
            </p>
            <button className="btn btn-primary" onClick={() => setOpenWalletModal(true)}>
              Connect Wallet to Get Started
            </button>
            <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
          </div>
        </div>
      </div>
    )
  }

  // Show loading while auto-discovery is in progress
  if (payroll.loading && !payroll.client) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div>
            <span className="loading loading-spinner loading-lg" />
            <p className="mt-4">Discovering contract...</p>
          </div>
        </div>
      </div>
    )
  }

  // Block non-admin wallets when a contract is initialized
  if (payroll.isInitialized && !payroll.isAdmin) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-3xl font-bold text-error">Access Denied</h1>
            <p className="py-4">
              This payroll contract is managed by a different wallet. Only the employer admin can access the dashboard.
            </p>
            <p className="text-sm text-base-content/60 font-mono break-all">
              Employer: {payroll.employerAddress}
            </p>
            <p className="text-sm text-base-content/60 mt-2 font-mono break-all">
              Connected: {activeAddress}
            </p>
            <button className="btn btn-primary mt-6" onClick={() => setOpenWalletModal(true)}>
              Switch Wallet
            </button>
            <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isConnected={!!activeAddress}
        hasContract={isReady}
      />
      <div className="flex-1 flex flex-col">
        <Header onConnectWallet={() => setOpenWalletModal(true)} />
        <main className="flex-1 p-6 bg-base-200">
          {renderPage()}
        </main>
      </div>
      <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
    </div>
  )
}

export default Home
