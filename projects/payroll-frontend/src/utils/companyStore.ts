import { companyApi, employeeApi, type EmployeeMetaData } from '../services/api'

const COMPANY_KEY = 'zeril_company'
const EMPLOYEE_META_KEY = 'zeril_emp_meta'

export interface CompanyMeta {
  name: string
  appId: string
  network: string
  treasuryAsset: string
  adminAddress?: string
}

export interface EmployeeMeta {
  name: string
  network: string
  settlementType: 'crypto' | 'bank'
  bankDetails?: string
}

// ── Company ──

export function saveCompany(appId: string, meta: CompanyMeta) {
  // Save to localStorage for instant reads
  const all = loadAllCompaniesLocal()
  all[appId] = meta
  localStorage.setItem(COMPANY_KEY, JSON.stringify(all))

  // Async persist to backend (fire-and-forget)
  companyApi.upsert({
    appId,
    name: meta.name,
    network: meta.network,
    treasuryAsset: meta.treasuryAsset,
    adminAddress: meta.adminAddress,
  }).catch(() => {})
}

export function loadCompany(appId: string): CompanyMeta | null {
  const all = loadAllCompaniesLocal()
  return all[appId] ?? null
}

export async function loadCompanyAsync(appId: string): Promise<CompanyMeta | null> {
  try {
    const data = await companyApi.get(appId)
    const meta: CompanyMeta = {
      name: data.name,
      appId: data.appId,
      network: data.network,
      treasuryAsset: data.treasuryAsset,
      adminAddress: data.adminAddress ?? undefined,
    }
    // Sync to localStorage
    const all = loadAllCompaniesLocal()
    all[appId] = meta
    localStorage.setItem(COMPANY_KEY, JSON.stringify(all))
    return meta
  } catch {
    return loadCompany(appId)
  }
}

function loadAllCompaniesLocal(): Record<string, CompanyMeta> {
  try {
    return JSON.parse(localStorage.getItem(COMPANY_KEY) || '{}')
  } catch {
    return {}
  }
}

// ── Employee Meta ──

export function saveEmployeeMeta(appId: string, address: string, meta: EmployeeMeta) {
  // Save to localStorage for instant reads
  const key = `${EMPLOYEE_META_KEY}_${appId}`
  const all = loadAllEmployeeMeta(appId)
  all[address] = meta
  localStorage.setItem(key, JSON.stringify(all))

  // Async persist to backend (fire-and-forget)
  employeeApi.create(appId, {
    walletAddress: address,
    name: meta.name,
    network: meta.network,
    settlementType: meta.settlementType,
    bankDetails: meta.bankDetails,
  }).catch(() => {})
}

export function loadEmployeeMeta(appId: string, address: string): EmployeeMeta | null {
  const all = loadAllEmployeeMeta(appId)
  return all[address] ?? null
}

export function loadAllEmployeeMeta(appId: string): Record<string, EmployeeMeta> {
  try {
    return JSON.parse(localStorage.getItem(`${EMPLOYEE_META_KEY}_${appId}`) || '{}')
  } catch {
    return {}
  }
}

export async function loadAllEmployeeMetaAsync(appId: string): Promise<Record<string, EmployeeMeta>> {
  try {
    const data = await employeeApi.list(appId)
    const result: Record<string, EmployeeMeta> = {}
    for (const emp of data) {
      result[emp.walletAddress] = {
        name: emp.name,
        network: emp.network,
        settlementType: emp.settlementType as 'crypto' | 'bank',
        bankDetails: emp.bankDetails ?? undefined,
      }
    }
    // Sync to localStorage
    localStorage.setItem(`${EMPLOYEE_META_KEY}_${appId}`, JSON.stringify(result))
    return result
  } catch {
    return loadAllEmployeeMeta(appId)
  }
}

export function removeEmployeeMeta(appId: string, address: string) {
  const all = loadAllEmployeeMeta(appId)
  delete all[address]
  localStorage.setItem(`${EMPLOYEE_META_KEY}_${appId}`, JSON.stringify(all))

  employeeApi.remove(appId, address).catch(() => {})
}
