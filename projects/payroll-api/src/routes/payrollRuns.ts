import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

router.post('/', async (req, res) => {
  const { companyAppId, totalAmount, employeesPaid, employeesFailed, algoRate, status } = req.body
  if (!companyAppId || totalAmount === undefined || employeesPaid === undefined) {
    res.status(400).json({ error: 'companyAppId, totalAmount, and employeesPaid are required' })
    return
  }

  const run = await prisma.payrollRun.create({
    data: {
      companyAppId,
      totalAmount: String(totalAmount),
      employeesPaid,
      employeesFailed: employeesFailed || 0,
      algoRate: algoRate ? String(algoRate) : undefined,
      status: status || 'completed',
    },
  })
  res.status(201).json(run)
})

router.get('/', async (req, res) => {
  const { appId, limit } = req.query

  if (!appId) {
    res.status(400).json({ error: 'appId query parameter is required' })
    return
  }

  const runs = await prisma.payrollRun.findMany({
    where: { companyAppId: appId as string },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit) || 50, 200),
  })
  res.json(runs)
})

export default router
