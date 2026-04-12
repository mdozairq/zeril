# PayRoll

A blockchain-enabled payroll platform built on [Algorand](https://algorand.co). Employers can register employees, set salaries, and pay them in USDC stablecoins — all managed by an on-chain smart contract.

## Overview

PayRoll is a full-stack decentralized application (dApp) that brings payroll management on-chain. The smart contract acts as the single source of truth for employee records and salary disbursements, while the React frontend provides a dashboard for employers to manage everything through their Algorand wallet.

### Key Features

- **On-chain employee registry** — Employee records (salary, active status, last paid round) are stored in contract box storage.
- **USDC salary payments** — Salaries are paid in USDC stablecoins via inner asset-transfer transactions, avoiding crypto volatility.
- **Employer access control** — Only the wallet that initialized the contract can manage employees and run payroll.
- **Auto-discovery** — The frontend automatically detects previously deployed contracts for the connected wallet.
- **Multi-wallet support** — Supports Defly, Pera, Lute, Exodus wallets on TestNet/MainNet and KMD on LocalNet.

### How It Works

1. **Deploy & Initialize** — The employer deploys the `Employer` smart contract and initializes it with a USDC asset ID.
2. **Bootstrap** — The contract opts into the USDC ASA so it can hold and transfer tokens.
3. **Add Employees** — Register employee wallet addresses with their monthly salary (in USDC micro-units).
4. **Run Payroll** — Pay individual employees. The contract sends USDC directly to the employee's wallet via an inner transaction.

## Project Structure

This is an AlgoKit monorepo with two sub-projects:

```
payroll/
├── projects/
│   ├── payroll-contracts/          # Algorand smart contract (TypeScript)
│   │   ├── smart_contracts/
│   │   │   ├── employer/
│   │   │   │   ├── contract.algo.ts       # Employer contract (PuyaTs)
│   │   │   │   ├── contract.algo.spec.ts  # Unit tests
│   │   │   │   ├── contract.e2e.spec.ts   # E2E tests
│   │   │   │   └── deploy-config.ts       # Deployment configuration
│   │   │   ├── artifacts/                 # Compiled ABI/app specs
│   │   │   └── index.ts                   # Deployer entry point
│   │   └── package.json
│   │
│   └── payroll-frontend/           # React frontend
│       ├── src/
│       │   ├── components/
│       │   │   ├── Employee/        # AddEmployeeForm, EmployeeList
│       │   │   ├── Layout/          # Sidebar, Header
│       │   │   ├── Payroll/         # PayrollPreview, PayrollStatus
│       │   │   ├── ConnectWallet.tsx
│       │   │   └── Account.tsx
│       │   ├── pages/               # Dashboard, Employees, RunPayroll, Settings
│       │   ├── hooks/               # usePayrollContract, useEmployees, useUsdcBalance
│       │   ├── contracts/           # Auto-generated typed clients
│       │   └── App.tsx
│       └── package.json
│
├── .github/workflows/              # CI/CD pipelines
├── .algokit.toml                   # Workspace configuration
└── payroll.code-workspace          # VS Code multi-root workspace
```

## Smart Contract

The `Employer` contract is written in [Algorand TypeScript (PuyaTs)](https://github.com/algorandfoundation/puya-ts) and compiles to TEAL bytecode.

### Contract Methods

| Method | Description |
|--------|-------------|
| `initialize(usdcAsset)` | Set the employer wallet and USDC asset ID. One-time call. |
| `bootstrap(mbrPayment)` | Opt the contract into USDC. Requires MBR payment. |
| `addEmployee(employee, salary, mbrPay)` | Register an employee with salary. Requires MBR for box storage. |
| `removeEmployee(employee)` | Soft-delete an employee (sets `isActive = 0`). |
| `updateSalary(employee, newSalary)` | Update an employee's salary. |
| `payEmployee(employee)` | Send USDC salary to the employee via inner transaction. |
| `getEmployee(employee)` | Read-only: returns employee record (salary, status, last paid round). |

### Storage

- **Global state**: `employer` (admin address), `usdcAssetId`, `employeeCount`, `totalPayrollRuns`
- **Box storage**: `employees` BoxMap keyed by employee account, storing salary, active flag, and last paid round

## Tech Stack

### Smart Contracts
- [Algorand TypeScript](https://github.com/algorandfoundation/puya-ts) (`@algorandfoundation/algorand-typescript`) — Contract language
- [Puya compiler](https://github.com/algorandfoundation/puya-ts) — Compiles TypeScript to TEAL
- [AlgoKit Utils](https://github.com/algorandfoundation/algokit-utils-ts) — Transaction composition and deployment
- [algosdk v3](https://github.com/algorand/js-algorand-sdk) — Algorand SDK
- [Vitest](https://vitest.dev/) — Testing framework

### Frontend
- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — Build tool
- [Tailwind CSS](https://tailwindcss.com/) + [daisyUI](https://daisyui.com/) — Styling
- [@txnlab/use-wallet-react](https://github.com/TxnLab/use-wallet) — Wallet integration (Defly, Pera, Lute, Exodus, KMD)
- [AlgoKit Client Generator](https://github.com/algorandfoundation/algokit-client-generator-ts) — Auto-generates typed contract clients

### CI/CD
- GitHub Actions workflows for contract CI/CD and frontend CI/CD
- Automated TestNet deployment on push to `main`

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20.0
- [npm](https://www.npmjs.com/) >= 9.0
- [Docker](https://www.docker.com/) (for LocalNet)
- [AlgoKit CLI](https://github.com/algorandfoundation/algokit-cli) >= 2.0

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd payroll
algokit project bootstrap all
```

### 2. Start LocalNet

```bash
algokit localnet start
```

### 3. Build contracts and generate clients

```bash
algokit project run build
```

This compiles the smart contract, generates ABI artifacts, and creates typed TypeScript clients used by the frontend.

### 4. Configure environment

From the `projects/payroll-contracts` directory:

```bash
algokit generate env-file -a target_network localnet
```

### 5. Deploy contracts (optional)

```bash
cd projects/payroll-contracts
npm run deploy
```

Or deploy via the frontend Settings page after connecting a wallet.

### 6. Run the frontend

```bash
cd projects/payroll-frontend
npm run dev
```

Open the app in your browser, connect a wallet, and follow the setup wizard (Deploy > Initialize > Bootstrap).

## Development Commands

```bash
# Workspace-level
algokit project run build       # Build all sub-projects
algokit localnet start          # Start local Algorand network
algokit localnet stop           # Stop local network
algokit localnet reset          # Reset local network state

# Contracts (from projects/payroll-contracts/)
npm run build                   # Compile contracts + generate clients
npm run test                    # Run tests with coverage
npm run test:watch              # Run tests in watch mode
npm run lint                    # Lint contract code
npm run deploy                  # Deploy to configured network

# Frontend (from projects/payroll-frontend/)
npm run dev                     # Start dev server
npm run build                   # Production build
npm run test                    # Run unit tests
npm run playwright:test         # Run E2E tests
npm run lint                    # Lint frontend code
```

## CI/CD

GitHub Actions workflows are in [`.github/workflows/`](./.github/workflows):

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `payroll-contracts-ci.yaml` | PR / push | Lint, type-check, test contracts |
| `payroll-contracts-cd.yaml` | Push to `main` | Deploy contracts to TestNet |
| `payroll-frontend-ci.yaml` | PR / push | Lint, type-check, build frontend |
| `payroll-frontend-cd.yaml` | Push to `main` | Deploy frontend |
| `validate.yaml` | PR | Workspace-level validation |
| `release.yaml` | Tag | Release workflow |

## License

See individual sub-project directories for license information.
