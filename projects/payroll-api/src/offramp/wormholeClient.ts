export type WormholeBridgeResult = {
  bridgeRef: string
}

export async function wormholeBridgeSandbox(input: {
  companyAppId: string
  employeeWalletAddress: string
  amountUsdcMicrounits: string
  idempotencyKey: string
}) : Promise<WormholeBridgeResult> {
  const base = process.env.WORMHOLE_SANDBOX_URL
  if (!base) {
    // Fallback for local development: simulate a bridge reference.
    return { bridgeRef: `wh_sim_${input.idempotencyKey.slice(0, 12)}` }
  }

  const res = await fetch(`${base.replace(/\/$/, '')}/bridge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Wormhole sandbox error: ${res.status} ${body}`)
  }
  const json = await res.json() as Partial<WormholeBridgeResult>
  if (!json.bridgeRef) throw new Error('Wormhole sandbox: missing bridgeRef')
  return { bridgeRef: json.bridgeRef }
}

