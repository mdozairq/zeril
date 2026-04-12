const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `API error: ${res.status}`)
  }
  return res.json()
}

// ── Company types ──

export interface CompanyData {
  id: string
  appId: string
  name: string
  network: string
  treasuryAsset: string
  createdAt: string
  updatedAt: string
}

export interface CompanyInput {
  appId: string
  name: string
  network: string
  treasuryAsset?: string
}

// ── Employee types ──

export interface EmployeeMetaData {
  id: string
  companyAppId: string
  walletAddress: string
  name: string
  network: string
  settlementType: string
  country: string | null
  kycStatus: string
  bankDetails: string | null
  createdAt: string
  updatedAt: string
}

export interface EmployeeMetaInput {
  walletAddress: string
  name: string
  network?: string
  settlementType?: string
  country?: string
  bankDetails?: string
}

// ── Audit types ──

export interface AuditLogData {
  id: string
  companyAppId: string
  action: string
  actorAddress: string
  entityType: string | null
  entityId: string | null
  metadata: string | null
  createdAt: string
}

export interface AuditLogInput {
  companyAppId: string
  action: string
  actorAddress: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export interface AuditFilters {
  action?: string
  from?: string
  to?: string
  limit?: number
}

// ── PayrollRun types ──

export interface PayrollRunData {
  id: string
  companyAppId: string
  totalAmount: string
  employeesPaid: number
  employeesFailed: number
  algoRate: string | null
  status: string
  createdAt: string
}

export interface PayrollRunInput {
  companyAppId: string
  totalAmount: string
  employeesPaid: number
  employeesFailed?: number
  algoRate?: string
  status?: string
}

// ── Company API ──

export const companyApi = {
  upsert: (data: CompanyInput) =>
    request<CompanyData>('/api/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (appId: string) =>
    request<CompanyData & { employees: EmployeeMetaData[] }>(`/api/companies/${appId}`),

  getOrNull: async (appId: string) => {
    try {
      return await companyApi.get(appId)
    } catch {
      return null
    }
  },
}

// ── Employee API ──

export const employeeApi = {
  list: (appId: string) =>
    request<EmployeeMetaData[]>(`/api/companies/${appId}/employees`),

  create: (appId: string, data: EmployeeMetaInput) =>
    request<EmployeeMetaData>(`/api/companies/${appId}/employees`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (appId: string, address: string, data: Partial<EmployeeMetaInput>) =>
    request<EmployeeMetaData>(`/api/companies/${appId}/employees/${address}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (appId: string, address: string) =>
    request<{ success: boolean }>(`/api/companies/${appId}/employees/${address}`, {
      method: 'DELETE',
    }),
}

// ── Audit API ──

export const auditApi = {
  create: (data: AuditLogInput) =>
    request<AuditLogData>('/api/audit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (appId: string, filters?: AuditFilters) => {
    const params = new URLSearchParams({ appId })
    if (filters?.action) params.set('action', filters.action)
    if (filters?.from) params.set('from', filters.from)
    if (filters?.to) params.set('to', filters.to)
    if (filters?.limit) params.set('limit', String(filters.limit))
    return request<AuditLogData[]>(`/api/audit?${params}`)
  },
}

// ── PayrollRun API ──

export const payrollRunApi = {
  create: (data: PayrollRunInput) =>
    request<PayrollRunData>('/api/payroll-runs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (appId: string, limit?: number) => {
    const params = new URLSearchParams({ appId })
    if (limit) params.set('limit', String(limit))
    return request<PayrollRunData[]>(`/api/payroll-runs?${params}`)
  },
}
