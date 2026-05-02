import { Router } from 'express'
import { prisma } from '../db.js'
import { sha256Hex } from '../utils/crypto.js'
import { calculateAccruedYieldAprProRata } from '../treasury/yield.js'

const router = Router()

function aprBps() {
  const raw = process.env.CUSTODY_APR_BPS
  const v = raw ? BigInt(raw) : 500n
  if (v < 0n) return 0n
  if (v > 5000n) return 5000n
  return v
}

router.post('/custody', async (req, res) => {
  const { companyAppId, amountUsdcMicrounits } = req.body as { companyAppId?: string; amountUsdcMicrounits?: string }
  if (!companyAppId || !amountUsdcMicrounits) {
    res.status(400).json({ error: 'companyAppId and amountUsdcMicrounits are required' })
    return
  }

  const idempotencyKey = (req.header('Idempotency-Key') || '').trim()
    || sha256Hex(`deposit:${companyAppId}:${amountUsdcMicrounits}:${Date.now()}`)

  const existing = await prisma.custodyEvent.findUnique({ where: { idempotencyKey } })
  if (existing) {
    res.json(existing)
    return
  }

  const row = await prisma.custodyEvent.create({
    data: {
      companyAppId,
      type: 'deposit',
      amountUsdcMicrounits: String(amountUsdcMicrounits),
      idempotencyKey,
    },
  })

  res.status(201).json(row)
})

router.post('/custody/withdraw', async (req, res) => {
  const { companyAppId, amountUsdcMicrounits } = req.body as { companyAppId?: string; amountUsdcMicrounits?: string }
  if (!companyAppId || !amountUsdcMicrounits) {
    res.status(400).json({ error: 'companyAppId and amountUsdcMicrounits are required' })
    return
  }

  const idempotencyKey = (req.header('Idempotency-Key') || '').trim()
    || sha256Hex(`withdraw:${companyAppId}:${amountUsdcMicrounits}:${Date.now()}`)

  const existing = await prisma.custodyEvent.findUnique({ where: { idempotencyKey } })
  if (existing) {
    res.json(existing)
    return
  }

  const row = await prisma.custodyEvent.create({
    data: {
      companyAppId,
      type: 'withdraw',
      amountUsdcMicrounits: String(amountUsdcMicrounits),
      idempotencyKey,
    },
  })

  res.status(201).json(row)
})

router.get('/companies/:appId/custody', async (req, res) => {
  const { appId } = req.params
  const events = await prisma.custodyEvent.findMany({
    where: { companyAppId: appId },
    orderBy: { createdAt: 'asc' },
  })

  const mapped = events.map((e) => ({
    type: e.type as 'deposit' | 'withdraw',
    amountUsdcMicrounits: BigInt(e.amountUsdcMicrounits),
    createdAt: e.createdAt,
  }))

  const summary = calculateAccruedYieldAprProRata({
    events: mapped,
    now: new Date(),
    aprBps: aprBps(),
  })

  res.json({
    aprBps: aprBps().toString(),
    principal: summary.principal.toString(),
    accruedYield: summary.accruedYield.toString(),
    totalValue: summary.totalValue.toString(),
    events: events.map((e) => ({ ...e, amountUsdcMicrounits: String(e.amountUsdcMicrounits) })),
  })
})

export default router

