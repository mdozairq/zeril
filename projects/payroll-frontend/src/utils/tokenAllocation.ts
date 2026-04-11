const ALLOCATION_KEY = 'zeril_allocation'

export interface TokenAllocationEntry {
  token: string
  percentage: number
  walletAddress?: string
}

export interface AllocationConfig {
  appId: string
  allocations: TokenAllocationEntry[]
  updatedAt: string
}

function storageKey(walletAddress: string): string {
  return `${ALLOCATION_KEY}_${walletAddress}`
}

export function saveAllocation(walletAddress: string, config: AllocationConfig) {
  localStorage.setItem(storageKey(walletAddress), JSON.stringify(config))
}

export function loadAllocation(walletAddress: string): AllocationConfig | null {
  try {
    const raw = localStorage.getItem(storageKey(walletAddress))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function getDefaultAllocation(appId: string): AllocationConfig {
  return {
    appId,
    allocations: [
      { token: 'USDC', percentage: 100 },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function validateAllocations(allocations: TokenAllocationEntry[]): boolean {
  const total = allocations.reduce((sum, a) => sum + a.percentage, 0)
  return Math.abs(total - 100) < 0.01 && allocations.every(a => a.percentage >= 0)
}
