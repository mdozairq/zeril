import { getSaberConfig, newSaberRequestId, saberRequestHeaders } from '../lib/saberAuth.js'

export type SaberOfframpResult = {
  offrampRef: string
}

/**
 * Payroll off-ramp step that maps to Saber "sell crypto for fiat" flow.
 *
 * Full production flow (see https://docs.saber.money/docs/api-method):
 * 1. Register merchant (API key + secret from Saber)
 * 2. Register each employee as a Saber user → store saberUserId on EmployeeMeta
 * 3. Employee KYC + bank account on Saber (or KYC sharing from PayRoll)
 * 4. Deposit USDC to Saber (external wallet or pool wallet)
 * 5. POST sell transaction → returns order id (offrampRef)
 * 6. Webhooks update order status → update OfframpRequest in DB
 *
 * Today: if SABER_API_KEY/SECRET are set we call a placeholder path; otherwise simulate.
 */
export async function saberOfframpSandbox(input: {
  companyAppId: string
  employeeWalletAddress: string
  amountUsdcMicrounits: string
  bridgeRef: string
  idempotencyKey: string
  saberUserId?: string
}): Promise<SaberOfframpResult> {
  const saber = getSaberConfig()

  // Legacy custom stub URL (local mock server)
  const legacyStub = process.env.SABER_SANDBOX_URL
  if (!saber.isConfigured && legacyStub) {
    const res = await fetch(`${legacyStub.replace(/\/$/, '')}/offramp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Saber stub error: ${res.status} ${body}`)
    }
    const json = (await res.json()) as Partial<SaberOfframpResult>
    if (!json.offrampRef) throw new Error('Saber stub: missing offrampRef')
    return { offrampRef: json.offrampRef }
  }

  if (!saber.isConfigured) {
    return { offrampRef: `sb_sim_${input.idempotencyKey.slice(0, 12)}` }
  }

  const userId = input.saberUserId || saber.sandboxUserId
  if (!userId) {
    throw new Error(
      'Saber user id required: set SABER_SANDBOX_USER_ID or pass saberUserId per employee after Saber user registration',
    )
  }

  // TODO: wire to Saber sell API once employee bank + KYC exist on Saber.
  // Example endpoint from docs: POST {baseUrl}/wallet/conversion/fiat/sell
  const sellPath = '/wallet/conversion/fiat/sell'
  const headers = saberRequestHeaders({
    clientId: saber.clientId,
    clientSecret: saber.clientSecret,
    userId,
    requestId: newSaberRequestId(),
  })

  const cryptoAmount = Number(input.amountUsdcMicrounits) / 1_000_000
  const body = {
    source_id: input.bridgeRef || input.idempotencyKey,
    crypto_symbol: 'USDC',
    crypto_amount: cryptoAmount,
    fiat_symbol: 'INR',
    payment_method: 'bank_transfer',
    metadata: {
      companyAppId: input.companyAppId,
      employeeWalletAddress: input.employeeWalletAddress,
    },
  }

  const res = await fetch(`${saber.baseUrl}${sellPath}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const text = await res.text().catch(() => '')
  if (!res.ok) {
    throw new Error(`Saber offramp API error: ${res.status} ${text}`)
  }

  let json: { success?: boolean; data?: { id?: string } }
  try {
    json = JSON.parse(text) as typeof json
  } catch {
    throw new Error(`Saber offramp: invalid JSON response: ${text.slice(0, 200)}`)
  }

  const orderId = json.data?.id
  if (!orderId) {
    throw new Error(`Saber offramp: missing order id in response: ${text.slice(0, 200)}`)
  }

  return { offrampRef: orderId }
}
