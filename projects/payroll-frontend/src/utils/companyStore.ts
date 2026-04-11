const COMPANY_KEY = 'zeril_company'
const EMPLOYEE_META_KEY = 'zeril_emp_meta'

export interface CompanyMeta {
  name: string
  appId: string
  network: string
  treasuryAsset: string
}

export interface EmployeeMeta {
  name: string
  network: string
  settlementType: 'crypto' | 'bank'
  bankDetails?: string
}

export function saveCompany(appId: string, meta: CompanyMeta) {
  const all = loadAllCompanies()
  all[appId] = meta
  localStorage.setItem(COMPANY_KEY, JSON.stringify(all))
}

export function loadCompany(appId: string): CompanyMeta | null {
  const all = loadAllCompanies()
  return all[appId] ?? null
}

function loadAllCompanies(): Record<string, CompanyMeta> {
  try {
    return JSON.parse(localStorage.getItem(COMPANY_KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveEmployeeMeta(appId: string, address: string, meta: EmployeeMeta) {
  const key = `${EMPLOYEE_META_KEY}_${appId}`
  const all = loadAllEmployeeMeta(appId)
  all[address] = meta
  localStorage.setItem(key, JSON.stringify(all))
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
