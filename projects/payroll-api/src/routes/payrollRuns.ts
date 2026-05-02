import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

router.post('/', async (req, res) => {
  const { companyAppId, name, totalAmount, employeesPaid, employeesFailed, algoRate, status } = req.body
  if (!companyAppId) {
    res.status(400).json({ error: 'companyAppId is required' })
    return
  }

  try {
    const run = await prisma.payrollRun.create({
      data: {
        companyAppId,
        name: name || '',
        totalAmount: totalAmount ? String(totalAmount) : '0',
        employeesPaid: employeesPaid ?? 0,
        employeesFailed: employeesFailed ?? 0,
        algoRate: algoRate ? String(algoRate) : undefined,
        status: status || 'pending',
      },
    })
    res.status(201).json(run)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    if (msg.includes('Foreign key constraint')) {
      res.status(400).json({ error: 'Company not found. Save company settings first.' })
    } else {
      res.status(500).json({ error: msg })
    }
  }
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

router.get('/:id', async (req, res) => {
  const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } })
  if (!run) {
    res.status(404).json({ error: 'Payroll run not found' })
    return
  }
  res.json(run)
})

router.patch('/:id', async (req, res) => {
  const { totalAmount, employeesPaid, employeesFailed, algoRate, status } = req.body
  const data: Record<string, unknown> = {}
  if (totalAmount !== undefined) data.totalAmount = String(totalAmount)
  if (employeesPaid !== undefined) data.employeesPaid = employeesPaid
  if (employeesFailed !== undefined) data.employeesFailed = employeesFailed
  if (algoRate !== undefined) data.algoRate = String(algoRate)
  if (status !== undefined) data.status = status

  try {
    const run = await prisma.payrollRun.update({ where: { id: req.params.id }, data })
    res.json(run)
  } catch {
    res.status(404).json({ error: 'Payroll run not found' })
  }
})

export default router
