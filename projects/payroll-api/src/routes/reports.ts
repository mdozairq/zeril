import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

router.get('/reports/payroll', async (req, res) => {
  const { appId, from, to } = req.query
  if (!appId) {
    res.status(400).json({ error: 'appId query parameter is required' })
    return
  }

  const where: Record<string, unknown> = { companyAppId: appId as string }
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(from as string) }),
      ...(to && { lte: new Date(to as string) }),
    }
  }

  const runs = await prisma.payrollRun.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  const expenses = await prisma.expenseEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  const gross = runs.reduce((sum, r) => sum + BigInt(r.totalAmount), 0n)
  const fees = expenses.filter(e => e.type === 'fee').reduce((s, e) => s + BigInt(e.amountUsdcMicrounits), 0n)
  const tax = expenses.filter(e => e.type === 'tax').reduce((s, e) => s + BigInt(e.amountUsdcMicrounits), 0n)
  const other = expenses.filter(e => e.type !== 'fee' && e.type !== 'tax').reduce((s, e) => s + BigInt(e.amountUsdcMicrounits), 0n)

  res.json({
    appId,
    from: from ?? null,
    to: to ?? null,
    totals: {
      grossUsdcMicrounits: gross.toString(),
      feeUsdcMicrounits: fees.toString(),
      taxUsdcMicrounits: tax.toString(),
      otherUsdcMicrounits: other.toString(),
    },
    runs,
    expenses,
  })
})

router.post('/expenses', async (req, res) => {
  const { companyAppId, type, amountUsdcMicrounits, note } = req.body as {
    companyAppId?: string
    type?: string
    amountUsdcMicrounits?: string
    note?: string
  }

  if (!companyAppId || !type || !amountUsdcMicrounits) {
    res.status(400).json({ error: 'companyAppId, type, amountUsdcMicrounits are required' })
    return
  }

  const created = await prisma.expenseEvent.create({
    data: { companyAppId, type, amountUsdcMicrounits: String(amountUsdcMicrounits), note },
  })
  res.status(201).json(created)
})

export default router

