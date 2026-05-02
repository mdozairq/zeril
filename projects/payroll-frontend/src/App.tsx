import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import RoleSelection from './pages/RoleSelection'
import CompanyLayout from './layouts/CompanyLayout'
import EmployeeLayout from './layouts/EmployeeLayout'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import RunPayroll from './pages/RunPayroll'
import Settings from './pages/Settings'
import EmployeeOverview from './pages/employee/EmployeeOverview'
import EmployeeAllocation from './pages/employee/EmployeeAllocation'
import EmployeeRecords from './pages/employee/EmployeeRecords'
import EmployeeKyc from './pages/employee/EmployeeKyc'
import EmployeeOfframp from './pages/employee/EmployeeOfframp'
import EmployeeLeave from './pages/employee/EmployeeLeave'
import EmployeeKycReview from './pages/company/EmployeeKycReview'
import InviteAccept from './pages/InviteAccept'
import OfframpCompany from './pages/OfframpCompany'
import FinancialReports from './pages/FinancialReports'
import LeaveCompany from './pages/LeaveCompany'
import AuthBootstrapper from './auth/AuthBootstrapper'
import { AppShell } from './Home'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.LUTE },
    { id: WalletId.EXODUS },
  ]
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <BrowserRouter>
          <AppShell>
            <AuthBootstrapper />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/invite/:code" element={<InviteAccept />} />
              <Route path="/role-select" element={<RoleSelection />} />

              <Route path="/company" element={<CompanyLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="employees" element={<Employees />} />
                <Route path="kyc/:address" element={<EmployeeKycReview />} />
                <Route path="payroll" element={<RunPayroll />} />
                <Route path="offramp" element={<OfframpCompany />} />
                <Route path="reports" element={<FinancialReports />} />
                <Route path="leave" element={<LeaveCompany />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route path="/employee" element={<EmployeeLayout />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<EmployeeOverview />} />
                <Route path="allocation" element={<EmployeeAllocation />} />
                <Route path="records" element={<EmployeeRecords />} />
                <Route path="kyc" element={<EmployeeKyc />} />
                <Route path="offramp" element={<EmployeeOfframp />} />
                <Route path="leave" element={<EmployeeLeave />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </WalletProvider>
    </SnackbarProvider>
  )
}
