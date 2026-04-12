import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { EmployeeProvider, useEmployee } from '../contexts/EmployeeContext'
import { useWalletModal } from '../Home'
import { ellipseAddress } from '../utils/ellipseAddress'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

const tabs = [
  { id: 'overview', path: '/employee/overview', label: 'Overview' },
  { id: 'allocation', path: '/employee/allocation', label: 'Allocation' },
  { id: 'records', path: '/employee/records', label: 'Records' },
] as const

function EmployeeContent() {
  const { activeAddress } = useWallet()
  const { openWalletModal } = useWalletModal()
  const navigate = useNavigate()
  const location = useLocation()
  const employee = useEmployee()
  const network = getAlgodConfigFromViteEnvironment().network

  if (!activeAddress) {
    return <Navigate to="/role-select" replace />
  }

  if (!employee.connected) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
        <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'rgba(250,250,247,0.08)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-xs opacity-40 hover:opacity-60">&larr;</button>
            <div className="flex flex-col">
              <span className="font-serif italic text-lg leading-none">Z</span>
              <span className="font-mono text-[6px] tracking-[0.3em] uppercase -mt-0.5 opacity-40">eril</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono rounded" style={{ backgroundColor: 'rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.5)', border: '1px solid rgba(250,250,247,0.08)' }}>{network}</span>
            <span className="font-mono text-xs" style={{ color: 'rgba(250,250,247,0.5)' }}>{ellipseAddress(activeAddress)}</span>
          </div>
        </div>

        <div className="max-w-md mx-auto mt-24 px-6">
          <h2 className="text-xl font-light mb-2">Connect to Company</h2>
          <p className="text-xs mb-6" style={{ color: 'rgba(250,250,247,0.45)' }}>
            Enter the payroll contract App ID shared by your employer.
          </p>

          {employee.error && (
            <div className="mb-4 p-3 rounded text-xs" style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
              {employee.error}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Contract App ID"
              className="input input-bordered input-sm flex-1"
              value={employee.appIdInput}
              onChange={(e) => employee.setAppIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && employee.handleConnect()}
            />
            <button
              onClick={employee.handleConnect}
              disabled={employee.loading || !employee.appIdInput}
              className="btn btn-primary btn-sm"
            >
              {employee.loading ? <span className="loading loading-spinner loading-xs" /> : 'Connect'}
            </button>
          </div>

          <div className="mt-8 p-4 rounded-xl text-xs" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="font-semibold mb-2">How to connect:</div>
            <ol className="space-y-1 list-decimal list-inside" style={{ color: 'rgba(250,250,247,0.5)' }}>
              <li>Ask your employer for the payroll App ID</li>
              <li>Enter it above and click Connect</li>
              <li>View your salary and configure allocation</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'rgba(250,250,247,0.08)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-xs opacity-40 hover:opacity-60">&larr;</button>
          <div className="flex flex-col">
            <span className="font-serif italic text-lg leading-none">Z</span>
            <span className="font-mono text-[6px] tracking-[0.3em] uppercase -mt-0.5 opacity-40">eril</span>
          </div>
          {employee.companyMeta && (
            <span className="text-xs opacity-40 ml-2">{employee.companyMeta.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-mono rounded" style={{ backgroundColor: 'rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.5)', border: '1px solid rgba(250,250,247,0.08)' }}>{network}</span>
          <button onClick={openWalletModal} className="font-mono text-xs" style={{ color: 'rgba(250,250,247,0.5)' }}>
            {ellipseAddress(activeAddress)}
          </button>
        </div>
      </div>

      <div className="border-b px-6 flex gap-0" style={{ borderColor: 'rgba(250,250,247,0.08)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className="px-4 py-3 text-xs font-medium tracking-wider uppercase transition-colors"
            style={{
              color: location.pathname === tab.path ? '#FAFAF7' : 'rgba(250,250,247,0.35)',
              borderBottom: location.pathname === tab.path ? '2px solid #FAFAF7' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <Outlet />
      </div>
    </div>
  )
}

export default function EmployeeLayout() {
  return (
    <EmployeeProvider>
      <EmployeeContent />
    </EmployeeProvider>
  )
}
