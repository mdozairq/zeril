export type SaberOfframpResult = {
  offrampRef: string
}

export async function saberOfframpSandbox(input: {
  companyAppId: string
  employeeWalletAddress: string
  amountUsdcMicrounits: string
  bridgeRef: string
  idempotencyKey: string
}) : Promise<SaberOfframpResult> {
  const base = process.env.SABER_SANDBOX_URL
  if (!base) {
    // Fallback for local development: simulate an offramp reference.
    return { offrampRef: `sb_sim_${input.idempotencyKey.slice(0, 12)}` }
  }

  const res = await fetch(`${base.replace(/\/$/, '')}/offramp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Saber sandbox error: ${res.status} ${body}`)
  }
  const json = await res.json() as Partial<SaberOfframpResult>
  if (!json.offrampRef) throw new Error('Saber sandbox: missing offrampRef')
  return { offrampRef: json.offrampRef }
}

