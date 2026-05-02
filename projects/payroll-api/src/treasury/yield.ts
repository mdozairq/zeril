export type CustodyEventInput = {
  type: 'deposit' | 'withdraw'
  amountUsdcMicrounits: bigint
  createdAt: Date
}

const SECONDS_PER_YEAR = 365n * 24n * 60n * 60n

export function calculateAccruedYieldAprProRata(input: {
  events: CustodyEventInput[]
  now: Date
  aprBps: bigint // e.g. 500 = 5.00%
}) {
  const events = [...input.events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const nowMs = BigInt(input.now.getTime())

  let balance = 0n
  let accrued = 0n
  let lastMs: bigint | null = null

  for (const e of events) {
    const tMs = BigInt(e.createdAt.getTime())
    if (lastMs !== null && tMs > lastMs && balance > 0n) {
      const dtSeconds = (tMs - lastMs) / 1000n
      accrued += (balance * input.aprBps * dtSeconds) / (10_000n * SECONDS_PER_YEAR)
    }
    lastMs = tMs
    if (e.type === 'deposit') balance += e.amountUsdcMicrounits
    else balance = balance > e.amountUsdcMicrounits ? balance - e.amountUsdcMicrounits : 0n
  }

  if (lastMs !== null && nowMs > lastMs && balance > 0n) {
    const dtSeconds = (nowMs - lastMs) / 1000n
    accrued += (balance * input.aprBps * dtSeconds) / (10_000n * SECONDS_PER_YEAR)
  }

  return { principal: balance, accruedYield: accrued, totalValue: balance + accrued }
}

