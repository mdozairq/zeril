import { useState, useEffect } from 'react'
import { useSnackbar } from 'notistack'
import {
  type TokenAllocationEntry,
  type AllocationConfig,
  saveAllocation,
  loadAllocation,
  getDefaultAllocation,
  validateAllocations,
} from '../../utils/tokenAllocation'

interface TokenAllocationProps {
  walletAddress: string
  appId: string
  onSaveOnChain?: (usdcPct: bigint) => Promise<void>
}

const AVAILABLE_TOKENS = ['USDC', 'ALGO']

export default function TokenAllocation({ walletAddress, appId, onSaveOnChain }: TokenAllocationProps) {
  const { enqueueSnackbar } = useSnackbar()
  const [allocations, setAllocations] = useState<TokenAllocationEntry[]>([])
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    const existing = loadAllocation(walletAddress)
    if (existing && existing.appId === appId) {
      setAllocations(existing.allocations)
    } else {
      setAllocations(getDefaultAllocation(appId).allocations)
    }
  }, [walletAddress, appId])

  const updatePercentage = (index: number, value: number) => {
    const updated = [...allocations]
    updated[index] = { ...updated[index], percentage: value }
    setAllocations(updated)
    setSaved(false)
  }

  const addToken = () => {
    const usedTokens = allocations.map(a => a.token)
    const available = AVAILABLE_TOKENS.find(t => !usedTokens.includes(t))
    if (!available) return
    setAllocations([...allocations, { token: available, percentage: 0 }])
    setSaved(false)
  }

  const removeToken = (index: number) => {
    if (allocations.length <= 1) return
    setAllocations(allocations.filter((_, i) => i !== index))
    setSaved(false)
  }

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!validateAllocations(allocations)) {
      enqueueSnackbar('Allocations must total 100%', { variant: 'error' })
      return
    }

    setSaving(true)
    try {
      // Save to on-chain contract if callback provided
      if (onSaveOnChain) {
        const usdcAlloc = allocations.find(a => a.token === 'USDC')
        const usdcPct = BigInt(usdcAlloc?.percentage ?? 100)
        await onSaveOnChain(usdcPct)
      }

      // Save locally
      const config: AllocationConfig = {
        appId,
        allocations,
        updatedAt: new Date().toISOString(),
      }
      saveAllocation(walletAddress, config)
      setSaved(true)
      enqueueSnackbar('Token allocation saved' + (onSaveOnChain ? ' on-chain' : ''), { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Failed to save on-chain', { variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const total = allocations.reduce((sum, a) => sum + a.percentage, 0)
  const isValid = Math.abs(total - 100) < 0.01

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Token Allocation</h3>
        {!saved && (
          <span className="badge badge-warning badge-sm">Unsaved</span>
        )}
      </div>

      <p className="text-xs opacity-50">
        Configure how your salary is split across tokens. Total must equal 100%.
      </p>

      <div className="space-y-3">
        {allocations.map((alloc, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-[100px]">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: alloc.token === 'USDC' ? 'rgba(74,222,128,0.15)' : 'rgba(250,250,247,0.08)',
                  color: alloc.token === 'USDC' ? '#4ADE80' : '#FAFAF7',
                }}>
                {alloc.token === 'USDC' ? '$' : 'A'}
              </div>
              <span className="font-mono text-sm">{alloc.token}</span>
            </div>

            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={alloc.percentage}
                onChange={(e) => updatePercentage(i, Number(e.target.value))}
                className="range range-sm"
              />
            </div>

            <div className="w-16 text-right">
              <input
                type="number"
                min="0"
                max="100"
                value={alloc.percentage}
                onChange={(e) => updatePercentage(i, Number(e.target.value))}
                className="input input-bordered input-sm w-16 text-right font-mono text-sm"
              />
            </div>

            <span className="text-sm font-mono opacity-50">%</span>

            {allocations.length > 1 && (
              <button onClick={() => removeToken(i)} className="btn btn-ghost btn-xs text-error">
                &times;
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(250,250,247,0.06)' }}>
        <div className="flex items-center gap-3">
          {allocations.length < AVAILABLE_TOKENS.length && (
            <button onClick={addToken} className="btn btn-ghost btn-sm text-xs">
              + Add Token
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono text-sm ${isValid ? 'text-success' : 'text-error'}`}>
            {total}%
          </span>
          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            className={`btn btn-sm ${isValid ? 'btn-primary' : 'btn-disabled'}`}
          >
            {saving ? <span className="loading loading-spinner loading-xs" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
