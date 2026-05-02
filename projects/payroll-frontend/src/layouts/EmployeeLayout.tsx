import { useState } from 'react'
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { EmployeeProvider, useEmployee } from '../contexts/EmployeeContext'
import { useWalletModal } from '../Home'
import { ellipseAddress } from '../utils/ellipseAddress'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

const navItems = [
  { id: 'overview', path: '/employee/overview', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'allocation', path: '/employee/allocation', label: 'Allocation', icon: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75' },
  { id: 'records', path: '/employee/records', label: 'Payment History', icon: 'M12 6v6h4.5m5.25 0a9.75 9.75 0 11-19.5 0 9.75 9.75 0 0119.5 0z' },
  { id: 'kyc', path: '/employee/kyc', label: 'KYC', icon: 'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z' },
  { id: 'offramp', path: '/employee/offramp', label: 'Off-ramp', icon: 'M21 8.25V6.75a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6.75v1.5m18 0A2.25 2.25 0 0018.75 6H5.25A2.25 2.25 0 003 8.25m18 0v9A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25v-9m3 6h.008v.008H6v-.008zm3 0h.008v.008H9v-.008z' },
  { id: 'leave', path: '/employee/leave', label: 'Leave', icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
] as const

function EmployeeContent() {
  const { activeAddress } = useWallet()
  const { openWalletModal } = useWalletModal()
  const navigate = useNavigate()
  const location = useLocation()
  const employee = useEmployee()
  const network = getAlgodConfigFromViteEnvironment().network

  const [inviteCode, setInviteCode] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!activeAddress) {
    return <Navigate to="/role-select" replace />
  }

  if (!employee.connected) {
    if (employee.autoConnecting) {
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
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <span className="loading loading-spinner loading-lg" style={{ color: '#FAFAF7' }} />
            <p className="text-xs opacity-50">Connecting to your company…</p>
          </div>
        </div>
      )
    }

    const handleInviteAccept = async () => {
      if (!inviteCode.trim()) return
      setInviteLoading(true)
      setInviteError(null)
      try {
        await employee.acceptInvite(inviteCode.trim(), inviteName || undefined)
      } catch (e) {
        setInviteError(e instanceof Error ? e.message : 'Invalid or expired invite code')
      } finally {
        setInviteLoading(false)
      }
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
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono rounded" style={{ backgroundColor: 'rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.5)', border: '1px solid rgba(250,250,247,0.08)' }}>{network}</span>
            <span className="font-mono text-xs" style={{ color: 'rgba(250,250,247,0.5)' }}>{ellipseAddress(activeAddress)}</span>
          </div>
        </div>

        <div className="max-w-md mx-auto mt-24 px-6">
          <h2 className="text-xl font-light mb-2">Join Your Company</h2>
          <p className="text-xs mb-6" style={{ color: 'rgba(250,250,247,0.45)' }}>
            Enter the invite code shared by your employer to join the payroll system.
          </p>

          {(inviteError || employee.error) && (
            <div className="mb-4 p-3 rounded text-xs" style={{ backgroundColor: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }}>
              {inviteError || employee.error}
            </div>
          )}

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Invite code"
              className="input input-bordered input-sm w-full"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInviteAccept()}
              disabled={inviteLoading}
            />
            <input
              type="text"
              placeholder="Your name (optional)"
              className="input input-bordered input-sm w-full"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              disabled={inviteLoading}
            />
            <button
              onClick={handleInviteAccept}
              disabled={inviteLoading || !inviteCode.trim()}
              className="btn btn-primary btn-sm w-full"
            >
              {inviteLoading ? <span className="loading loading-spinner loading-xs" /> : 'Accept Invite & Connect'}
            </button>
          </div>

          <div className="mt-8 p-4 rounded-xl text-xs" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
            <div className="font-semibold mb-2">How it works:</div>
            <ol className="space-y-1 list-decimal list-inside" style={{ color: 'rgba(250,250,247,0.5)' }}>
              <li>Your employer sends you an invite code</li>
              <li>Enter the code above and click Accept</li>
              <li>You&apos;ll be automatically connected on future logins</li>
            </ol>
          </div>

          {/* Advanced: direct App ID connection */}
          <div className="mt-6">
            <button
              type="button"
              className="text-[10px] opacity-30 hover:opacity-50 transition-opacity"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '▾ Hide advanced' : '▸ Already have an App ID?'}
            </button>
            {showAdvanced && (
              <div className="mt-3 flex gap-2">
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
                  className="btn btn-outline btn-sm"
                >
                  {employee.loading ? <span className="loading loading-spinner loading-xs" /> : 'Connect'}
                </button>
              </div>
            )}
          </div>

          {employee.hasSavedCompanyMapping && (
            <button
              type="button"
              className="btn btn-ghost btn-xs mt-4 w-full"
              style={{ color: 'rgba(250,250,247,0.45)' }}
              onClick={employee.forgetSavedCompany}
            >
              Clear saved company
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
      {/* Sidebar */}
      <div className="w-64 min-h-screen p-4 border-r shrink-0" style={{ backgroundColor: '#0A0A0A', borderColor: 'rgba(250,250,247,0.06)' }}>
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex flex-col leading-none">
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: '28px', color: '#FAFAF7' }}>Z</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(250,250,247,0.4)', marginTop: '-2px' }}>eril</span>
          </div>
          <button onClick={() => navigate('/')} className="text-xs opacity-30 hover:opacity-60 transition-opacity">&larr; Exit</button>
        </div>

        {employee.companyMeta && (
          <div className="px-2 mb-6">
            <span className="text-xs opacity-40">{employee.companyMeta.name}</span>
          </div>
        )}

        <ul className="menu gap-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.id}>
                <button
                  className={`${isActive ? 'active' : ''} text-sm`}
                  onClick={() => navigate(item.path)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mt-auto pt-6 px-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-[10px] font-mono rounded" style={{ backgroundColor: 'rgba(250,250,247,0.06)', color: 'rgba(250,250,247,0.5)', border: '1px solid rgba(250,250,247,0.08)' }}>{network}</span>
          </div>
          <button onClick={openWalletModal} className="font-mono text-[11px] truncate w-full text-left" style={{ color: 'rgba(250,250,247,0.4)' }}>
            {ellipseAddress(activeAddress)}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
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
