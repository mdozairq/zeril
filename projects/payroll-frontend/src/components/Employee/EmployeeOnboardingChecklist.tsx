import { useEffect, useState, useCallback } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { onboardingApi, type OnboardingItem } from '../../services/api'

type Props = {
  appId: bigint
}

export default function EmployeeOnboardingChecklist({ appId }: Props) {
  const { activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [items, setItems] = useState<OnboardingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const appIdStr = appId.toString()

  const refresh = useCallback(async () => {
    if (!activeAddress) return
    setLoading(true)
    try {
      const res = await onboardingApi.get(appIdStr, activeAddress)
      setItems(res.items)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [activeAddress, appIdStr])

  useEffect(() => {
    refresh()
  }, [refresh])

  const toggle = async (item: OnboardingItem, completed: boolean) => {
    if (!activeAddress) return
    setUpdating(item.key)
    try {
      await onboardingApi.setItem(appIdStr, activeAddress, {
        itemKey: item.key,
        completed,
        actorAddress: activeAddress,
      })
      await refresh()
    } catch (e) {
      enqueueSnackbar(e instanceof Error ? e.message : 'Update failed', { variant: 'error' })
    } finally {
      setUpdating(null)
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="rounded-xl p-5 flex items-center gap-3" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
        <span className="loading loading-spinner loading-sm" />
        <span className="text-xs opacity-50">Loading onboarding…</span>
      </div>
    )
  }

  if (items.length === 0) return null

  const done = items.filter((i) => i.completedAt).length

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(250,250,247,0.03)', border: '1px solid rgba(250,250,247,0.06)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase mb-1" style={{ color: 'rgba(250,250,247,0.35)' }}>Getting started</div>
          <h3 className="text-sm font-semibold">Onboarding checklist</h3>
        </div>
        <span className="text-xs opacity-40">{done}/{items.length}</span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const complete = Boolean(item.completedAt)
          const busy = updating === item.key
          return (
            <li
              key={item.key}
              className="flex items-start gap-3 py-2 border-t first:border-t-0 first:pt-0"
              style={{ borderColor: 'rgba(250,250,247,0.06)' }}
            >
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={complete}
                disabled={busy}
                onChange={(e) => toggle(item, e.target.checked)}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm">{item.title}</div>
                {item.isRequired && (
                  <div className="text-[10px] opacity-35 mt-0.5">Required</div>
                )}
              </div>
              {busy && <span className="loading loading-spinner loading-xs" />}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
