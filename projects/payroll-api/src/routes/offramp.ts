import { Router } from 'express'
import { prisma } from '../db.js'
import { sha256Hex } from '../utils/crypto.js'
import { runOfframpOrchestrator } from '../offramp/orchestrator.js'

const router = Router()

router.post('/offramp', async (req, res) => {
  const { companyAppId, employeeWalletAddress, amountUsdcMicrounits } = req.body as {
    companyAppId?: string
    employeeWalletAddress?: string
    amountUsdcMicrounits?: string
  }

  if (!companyAppId || !employeeWalletAddress || !amountUsdcMicrounits) {
    res.status(400).json({ error: 'companyAppId, employeeWalletAddress, amountUsdcMicrounits are required' })
    return
  }

  const idempotencyKey = (req.header('Idempotency-Key') || '').trim() || sha256Hex(`${companyAppId}:${employeeWalletAddress}:${amountUsdcMicrounits}:${Date.now()}`)

  const existing = await prisma.offrampRequest.findUnique({ where: { idempotencyKey } })
  if (existing) {
    res.json(existing)
    return
  }

  const created = await prisma.offrampRequest.create({
    data: {
      companyAppId,
      employeeWalletAddress,
      amountUsdcMicrounits: String(amountUsdcMicrounits),
      idempotencyKey,
      status: 'created',
    },
  })

  // Sandbox orchestration: run async but return immediately.
  setTimeout(() => {
    runOfframpOrchestrator(created.id).catch(() => {})
  }, 0)

  res.status(201).json(created)
})

router.get('/offramp', async (req, res) => {
  const { appId, address, limit } = req.query
  const where: Record<string, unknown> = {}
  if (appId) where.companyAppId = appId as string
  if (address) where.employeeWalletAddress = address as string

  const rows = await prisma.offrampRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit) || 50, 200),
  })
  res.json(rows)
})

router.get('/offramp/:id', async (req, res) => {
  const row = await prisma.offrampRequest.findUnique({ where: { id: req.params.id } })
  if (!row) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(row)
})

router.post('/webhooks/offramp', async (req, res) => {
  // Sandbox webhook: expects { idempotencyKey, status, bridgeRef?, offrampRef?, error? }
  const { idempotencyKey, status, bridgeRef, offrampRef, error } = req.body as {
    idempotencyKey?: string
    status?: string
    bridgeRef?: string
    offrampRef?: string
    error?: string
  }

  if (!idempotencyKey || !status) {
    res.status(400).json({ error: 'idempotencyKey and status are required' })
    return
  }

  const existing = await prisma.offrampRequest.findUnique({ where: { idempotencyKey } })
  if (!existing) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const updated = await prisma.offrampRequest.update({
    where: { id: existing.id },
    data: {
      status,
      ...(bridgeRef !== undefined && { bridgeRef }),
      ...(offrampRef !== undefined && { offrampRef }),
      ...(error !== undefined && { lastError: error }),
    },
  })

  res.json(updated)
})

export default router

