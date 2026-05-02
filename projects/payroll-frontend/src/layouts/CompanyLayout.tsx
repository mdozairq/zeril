import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import Sidebar from '../components/Layout/Sidebar'
import Header from '../components/Layout/Header'
import { PayrollProvider, usePayroll } from '../contexts/PayrollContext'

function CompanyContent() {
  const { activeAddress } = useWallet()
  const location = useLocation()
  const { appId, isInitialized, isBootstrapped, isAdmin, loading, client } = usePayroll()

  if (!activeAddress) {
    return <Navigate to="/role-select" replace />
  }

  if (isInitialized && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-error mb-4">Access Denied</h1>
          <p className="text-sm opacity-50 mb-6">This payroll contract is managed by a different wallet.</p>
          <a href="/role-select" className="btn btn-primary btn-sm">Switch Role</a>
        </div>
      </div>
    )
  }

  const isReady = appId !== null && isInitialized && isBootstrapped
  const isSettingsPage = location.pathname === '/company/settings'
  const isDashboardPage = location.pathname === '/company/dashboard'
  const discoveryInProgress = loading && !client

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
      <Sidebar isConnected={!!activeAddress} hasContract={isReady} />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {discoveryInProgress ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <span className="loading loading-spinner loading-lg" />
                <p className="mt-4 text-sm opacity-50">Discovering contract...</p>
              </div>
            </div>
          ) : isSettingsPage || isDashboardPage ? (
            <Outlet />
          ) : !isReady ? (
            <Navigate to="/company/dashboard" replace />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}

export default function CompanyLayout() {
  return (
    <PayrollProvider>
      <CompanyContent />
    </PayrollProvider>
  )
}
