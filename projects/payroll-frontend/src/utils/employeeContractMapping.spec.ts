import {
  saveEmployeeContractAppId,
  loadEmployeeContractAppId,
  clearEmployeeContractAppId,
} from './employeeContractMapping'

function mockLocalStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
  } as Storage
}

describe('employeeContractMapping', () => {
  const w1 = 'WALLETABC123'
  const w1lower = w1.toLowerCase()

  beforeEach(() => {
    Object.defineProperty(global, 'localStorage', { value: mockLocalStorage(), configurable: true })
  })

  it('saves and loads per wallet (lowercase key)', () => {
    saveEmployeeContractAppId(w1, '12345')
    expect(localStorage.getItem(`zeril_employee_appid_${w1lower}`)).toBe('12345')
    expect(loadEmployeeContractAppId(w1)).toBe('12345')
    expect(loadEmployeeContractAppId(w1.toUpperCase())).toBe('12345')
  })

  it('clears mapping for wallet', () => {
    saveEmployeeContractAppId(w1, '999')
    clearEmployeeContractAppId(w1)
    expect(loadEmployeeContractAppId(w1)).toBeNull()
  })

  it('trims app id on save', () => {
    saveEmployeeContractAppId(w1, '  42  ')
    expect(loadEmployeeContractAppId(w1)).toBe('42')
  })
})
