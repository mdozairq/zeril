/**
 * Persists which payroll contract App ID an employee wallet last connected to.
 * First visit: user enters App ID once; later visits auto-connect via this mapping.
 */

const PREFIX = 'zeril_employee_appid_'

function key(walletAddress: string) {
  return `${PREFIX}${walletAddress.toLowerCase()}`
}

export function saveEmployeeContractAppId(walletAddress: string, appId: string) {
  try {
    localStorage.setItem(key(walletAddress), appId.trim())
  } catch {
    // ignore
  }
}

export function loadEmployeeContractAppId(walletAddress: string): string | null {
  try {
    const v = localStorage.getItem(key(walletAddress))
    return v && v.trim() ? v.trim() : null
  } catch {
    return null
  }
}

export function clearEmployeeContractAppId(walletAddress: string) {
  try {
    localStorage.removeItem(key(walletAddress))
  } catch {
    // ignore
  }
}
