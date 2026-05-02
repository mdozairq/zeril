const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getApiToken() {
  try {
    return localStorage.getItem('zeril_api_token')
  } catch {
    return null
  }
}

function clearExpiredTokens() {
  try {
    const token = localStorage.getItem('zeril_api_token')
    if (!token) return
    const parts = token.split('.')
    if (parts.length !== 3) return
    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('zeril_api_token')
      const sub = payload.sub ?? ''
      const role = payload.role ?? ''
      if (sub && role) {
        localStorage.removeItem(`zeril_api_token_${sub}_${role}`)
      }
    }
  } catch {
    // malformed token — clear it
    localStorage.removeItem('zeril_api_token')
  }
}

let _authRefreshPromise: Promise<void> | null = null

async function refreshAuth(): Promise<void> {
  if (_authRefreshPromise) return _authRefreshPromise
  _authRefreshPromise = (async () => {
    try {
      clearExpiredTokens()
      // Wait briefly for AuthBootstrapper to pick up the cleared state and re-auth
      await new Promise((r) => setTimeout(r, 2500))
    } finally {
      _authRefreshPromise = null
    }
  })()
  return _authRefreshPromise
}

function normalizeHeaders(h?: HeadersInit): Record<string, string> {
  if (!h) return {}
  if (Array.isArray(h)) return Object.fromEntries(h)
  if (h instanceof Headers) return Object.fromEntries(h.entries())
  return h as Record<string, string>
}

async function request<T>(path: string, options?: RequestInit, _retried = false): Promise<T> {
  clearExpiredTokens()
  const token = getApiToken()
  const optHeaders = normalizeHeaders(options?.headers)
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...optHeaders,
    },
  })
  if (res.status === 401 && !_retried) {
    await refreshAuth()
    return request<T>(path, options, true)
  }
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
  adminAddress?: string | null
  createdAt: string
  updatedAt: string
}

export interface CompanyInput {
  appId: string
  name: string
  network: string
  treasuryAsset?: string
  adminAddress?: string
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
  payoutMethod: string | null
  cryptoAddress: string | null
  cryptoNetwork: string | null
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

// ── KYC types ──

export type KycCaseStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export interface KycDocumentData {
  id: string
  caseId: string
  docType: string
  sha256: string
  country: string | null
  issuedAt: string | null
  expiresAt: string | null
  reference: string | null
  createdAt: string
}

export interface KycCaseData {
  id: string
  companyAppId: string
  employeeId: string
  status: KycCaseStatus
  nationality: string | null
  submittedAt: string | null
  reviewedAt: string | null
  reviewer: string | null
  rejectionNote: string | null
  createdAt: string
  updatedAt: string
  documents: KycDocumentData[]
}

export interface KycDocInput {
  docType: string
  sha256: string
  country?: string
  issuedAt?: string
  expiresAt?: string
  reference?: string
}

export interface KycUpsertInput {
  nationality?: string
  documents?: KycDocInput[]
}

export interface KycCaseResponse {
  employee: EmployeeMetaData
  kycCase: KycCaseData | null
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
  name: string
  totalAmount: string
  employeesPaid: number
  employeesFailed: number
  algoRate: string | null
  status: string
  createdAt: string
}

export interface PayrollRunInput {
  companyAppId: string
  name?: string
  totalAmount?: string
  employeesPaid?: number
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

  setPayoutPreference: (
    appId: string,
    address: string,
    data: { payoutMethod: 'crypto' | 'bank'; cryptoAddress?: string; cryptoNetwork?: string },
  ) =>
    request<EmployeeMetaData>(`/api/companies/${appId}/employees/${address}/payout-preference`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// ── KYC API ──

export const kycApi = {
  get: (appId: string, address: string) =>
    request<KycCaseResponse>(`/api/companies/${appId}/employees/${address}/kyc`),

  upsertDraft: (appId: string, address: string, data: KycUpsertInput) =>
    request<KycCaseData>(`/api/companies/${appId}/employees/${address}/kyc`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  submit: (appId: string, address: string, actorAddress: string) =>
    request<KycCaseData>(`/api/companies/${appId}/employees/${address}/kyc/submit`, {
      method: 'POST',
      body: JSON.stringify({ actorAddress }),
    }),

  approve: (appId: string, address: string, actorAddress: string) =>
    request<KycCaseData>(`/api/companies/${appId}/employees/${address}/kyc/approve`, {
      method: 'POST',
      body: JSON.stringify({ actorAddress }),
    }),

  reject: (appId: string, address: string, actorAddress: string, rejectionNote?: string) =>
    request<KycCaseData>(`/api/companies/${appId}/employees/${address}/kyc/reject`, {
      method: 'POST',
      body: JSON.stringify({ actorAddress, rejectionNote }),
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

  get: (id: string) =>
    request<PayrollRunData>(`/api/payroll-runs/${id}`),

  update: (id: string, data: Partial<Omit<PayrollRunInput, 'companyAppId'>>) =>
    request<PayrollRunData>(`/api/payroll-runs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  list: (appId: string, limit?: number) => {
    const params = new URLSearchParams({ appId })
    if (limit) params.set('limit', String(limit))
    return request<PayrollRunData[]>(`/api/payroll-runs?${params}`)
  },
}

// ── Invitations + onboarding ──

export interface InvitationCreateResponse {
  id: string
  email: string
  expiresAt: string
  inviteCode: string
}

export interface InvitationInfoResponse {
  companyAppId: string
  companyName: string
  email: string
  expiresAt: string
}

export interface OnboardingItem {
  key: string
  title: string
  isRequired: boolean
  completedAt: string | null
}

export const invitationApi = {
  create: (appId: string, data: { email: string; expiresInDays?: number; actorAddress?: string }) =>
    request<InvitationCreateResponse>(`/api/companies/${appId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (code: string) =>
    request<InvitationInfoResponse>(`/api/invitations/${code}`),

  accept: (code: string, data: { walletAddress: string; name?: string; actorAddress?: string }) =>
    request<{ success: boolean; companyAppId: string; employee: EmployeeMetaData }>(`/api/invitations/${code}/accept`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const onboardingApi = {
  get: (appId: string, address: string) =>
    request<{ items: OnboardingItem[] }>(`/api/companies/${appId}/onboarding/${address}`),

  setItem: (appId: string, address: string, data: { itemKey: string; completed: boolean; actorAddress?: string }) =>
    request<unknown>(`/api/companies/${appId}/onboarding/${address}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// ── Offramp API ──

export interface OfframpRequestData {
  id: string
  companyAppId: string
  employeeWalletAddress: string
  amountUsdcMicrounits: string
  status: string
  provider: string
  idempotencyKey: string
  bridgeRef: string | null
  offrampRef: string | null
  retries: number
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export const offrampApi = {
  create: (data: { companyAppId: string; employeeWalletAddress: string; amountUsdcMicrounits: string }, idempotencyKey?: string) =>
    request<OfframpRequestData>('/api/offramp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      body: JSON.stringify(data),
    }),

  list: (filters: { appId?: string; address?: string; limit?: number }) => {
    const params = new URLSearchParams()
    if (filters.appId) params.set('appId', filters.appId)
    if (filters.address) params.set('address', filters.address)
    if (filters.limit) params.set('limit', String(filters.limit))
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request<OfframpRequestData[]>(`/api/offramp${suffix}`)
  },

  get: (id: string) => request<OfframpRequestData>(`/api/offramp/${id}`),
}

// ── Custody API ──

export interface CustodySummary {
  aprBps: string
  principal: string
  accruedYield: string
  totalValue: string
  events: Array<{
    id: string
    companyAppId: string
    type: string
    amountUsdcMicrounits: string
    idempotencyKey: string
    createdAt: string
  }>
}

export const custodyApi = {
  deposit: (data: { companyAppId: string; amountUsdcMicrounits: string }, idempotencyKey?: string) =>
    request<unknown>('/api/custody', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      body: JSON.stringify(data),
    }),

  withdraw: (data: { companyAppId: string; amountUsdcMicrounits: string }, idempotencyKey?: string) =>
    request<unknown>('/api/custody/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) },
      body: JSON.stringify(data),
    }),

  get: (appId: string) => request<CustodySummary>(`/api/companies/${appId}/custody`),
}

// ── Reporting API ──

export interface ExpenseEventData {
  id: string
  companyAppId: string
  type: string
  amountUsdcMicrounits: string
  note: string | null
  createdAt: string
}

export interface PayrollReportResponse {
  appId: string
  from: string | null
  to: string | null
  totals: {
    grossUsdcMicrounits: string
    feeUsdcMicrounits: string
    taxUsdcMicrounits: string
    otherUsdcMicrounits: string
  }
  runs: PayrollRunData[]
  expenses: ExpenseEventData[]
}

export const reportingApi = {
  payrollReport: (params: { appId: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams({ appId: params.appId })
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    return request<PayrollReportResponse>(`/api/reports/payroll?${qs.toString()}`)
  },

  createExpense: (data: { companyAppId: string; type: string; amountUsdcMicrounits: string; note?: string }) =>
    request<ExpenseEventData>('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ── Leave API ──

export interface LeaveTypeData {
  id: string
  companyAppId: string
  key: string
  name: string
  isPaid: boolean
  createdAt: string
  updatedAt: string
}

export interface LeaveRequestData {
  id: string
  companyAppId: string
  walletAddress: string
  leaveTypeKey: string
  startDate: string
  endDate: string
  days: number
  status: string
  note: string | null
  reviewer: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export const leaveApi = {
  listTypes: (appId: string) => request<LeaveTypeData[]>(`/api/companies/${appId}/leave-types`),
  upsertType: (appId: string, data: { key: string; name: string; isPaid?: boolean }) =>
    request<LeaveTypeData>(`/api/companies/${appId}/leave-types`, { method: 'POST', body: JSON.stringify(data) }),
  deleteType: (appId: string, key: string) =>
    request<{ success: boolean }>(`/api/companies/${appId}/leave-types/${key}`, { method: 'DELETE' }),

  runAllocations: (appId: string, fiscalYear: string, defaultDays = 20) =>
    request<unknown>(`/api/companies/${appId}/leave-allocations/run?fiscalYear=${encodeURIComponent(fiscalYear)}&defaultDays=${defaultDays}`, { method: 'POST' }),

  balance: (appId: string, address: string, fiscalYear: string) =>
    request<{ fiscalYear: string; allocated: number; used: number; remaining: number }>(
      `/api/companies/${appId}/employees/${address}/leave-balance?fiscalYear=${encodeURIComponent(fiscalYear)}`
    ),

  createRequest: (data: { companyAppId: string; walletAddress: string; leaveTypeKey: string; startDate: string; endDate: string; days: number; note?: string }) =>
    request<LeaveRequestData>('/api/leave-requests', { method: 'POST', body: JSON.stringify(data) }),

  listRequests: (filters: { appId: string; address?: string; status?: string }) => {
    const qs = new URLSearchParams({ appId: filters.appId })
    if (filters.address) qs.set('address', filters.address)
    if (filters.status) qs.set('status', filters.status)
    return request<LeaveRequestData[]>(`/api/leave-requests?${qs.toString()}`)
  },

  approve: (id: string, actorAddress: string) =>
    request<LeaveRequestData>(`/api/leave-requests/${id}/approve`, { method: 'POST', body: JSON.stringify({ actorAddress }) }),
  reject: (id: string, actorAddress: string) =>
    request<LeaveRequestData>(`/api/leave-requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ actorAddress }) }),
}
