import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireCompanyAdmin, requireSelfAddress } from '../middleware/auth.js'

const router = Router()

router.get('/companies/:appId/leave-types', async (req, res) => {
  const appId = String(req.params.appId)
  const rows = await prisma.leaveType.findMany({ where: { companyAppId: appId }, orderBy: { createdAt: 'asc' } })
  res.json(rows)
})

router.post('/companies/:appId/leave-types', requireAuth('employer'), requireCompanyAdmin, async (req, res) => {
  const appId = String(req.params.appId)
  const { key, name, isPaid } = req.body as { key?: string; name?: string; isPaid?: boolean }
  if (!key || !name) {
    res.status(400).json({ error: 'key and name are required' })
    return
  }
  const created = await prisma.leaveType.upsert({
    where: { companyAppId_key: { companyAppId: appId, key } },
    update: { name, ...(isPaid !== undefined && { isPaid }) },
    create: { companyAppId: appId, key, name, isPaid: isPaid ?? true },
  })
  res.status(201).json(created)
})

router.put('/companies/:appId/leave-types/:key', requireAuth('employer'), requireCompanyAdmin, async (req, res) => {
  const appId = String(req.params.appId)
  const { name, isPaid } = req.body as { name?: string; isPaid?: boolean }
  try {
    const updated = await prisma.leaveType.update({
      where: { companyAppId_key: { companyAppId: appId, key: String(req.params.key) } },
      data: { ...(name !== undefined && { name }), ...(isPaid !== undefined && { isPaid }) },
    })
    res.json(updated)
  } catch {
    res.status(404).json({ error: 'Leave type not found' })
  }
})

router.delete('/companies/:appId/leave-types/:key', requireAuth('employer'), requireCompanyAdmin, async (req, res) => {
  const appId = String(req.params.appId)
  try {
    await prisma.leaveType.delete({
      where: { companyAppId_key: { companyAppId: appId, key: String(req.params.key) } },
    })
    res.json({ success: true })
  } catch {
    res.status(404).json({ error: 'Leave type not found' })
  }
})

router.post('/companies/:appId/leave-allocations/run', requireAuth('employer'), requireCompanyAdmin, async (req, res) => {
  const appId = String(req.params.appId)
  const fy = req.query.fiscalYear
  const dd = req.query.defaultDays
  const fiscalYear = String(Array.isArray(fy) ? fy[0] : (fy ?? new Date().getFullYear()))
  const defaultDays = Number(Array.isArray(dd) ? dd[0] : (dd ?? 20))

  const employees = await prisma.employeeMeta.findMany({ where: { companyAppId: appId } })
  const allocations = []
  for (const e of employees) {
    const a = await prisma.leaveAllocation.upsert({
      where: { companyAppId_walletAddress_fiscalYear: { companyAppId: appId, walletAddress: e.walletAddress, fiscalYear } },
      update: { daysAllocated: defaultDays },
      create: { companyAppId: appId, walletAddress: e.walletAddress, fiscalYear, daysAllocated: defaultDays, carryForward: 0 },
    })
    allocations.push(a)
  }
  res.json({ fiscalYear, count: allocations.length, allocations })
})

router.get('/companies/:appId/employees/:address/leave-balance', async (req, res) => {
  const appId = String(req.params.appId)
  const address = String(req.params.address)
  const fy = req.query.fiscalYear
  const fiscalYear = String(Array.isArray(fy) ? fy[0] : (fy ?? new Date().getFullYear()))
  const allocation = await prisma.leaveAllocation.findUnique({
    where: { companyAppId_walletAddress_fiscalYear: { companyAppId: appId, walletAddress: address, fiscalYear } },
  })

  const approvedDays = await prisma.leaveRequest.aggregate({
    where: { companyAppId: appId, walletAddress: address, status: 'approved' },
    _sum: { days: true },
  })

  const allocated = allocation?.daysAllocated ?? 0
  const used = approvedDays._sum.days ?? 0
  const remaining = Math.max(allocated - used, 0)

  res.json({ fiscalYear, allocated, used, remaining })
})

router.post('/leave-requests', requireAuth('employee'), requireSelfAddress('walletAddress'), async (req, res) => {
  const { companyAppId, walletAddress, leaveTypeKey, startDate, endDate, days, note } = req.body as {
    companyAppId?: string
    walletAddress?: string
    leaveTypeKey?: string
    startDate?: string
    endDate?: string
    days?: number
    note?: string
  }
  if (!companyAppId || !walletAddress || !leaveTypeKey || !startDate || !endDate || !days) {
    res.status(400).json({ error: 'companyAppId, walletAddress, leaveTypeKey, startDate, endDate, days are required' })
    return
  }
  const created = await prisma.leaveRequest.create({
    data: {
      companyAppId,
      walletAddress,
      leaveTypeKey,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days,
      note,
    },
  })
  res.status(201).json(created)
})

router.get('/leave-requests', async (req, res) => {
  const { appId, address, status } = req.query
  if (!appId) {
    res.status(400).json({ error: 'appId query parameter is required' })
    return
  }
  const where: Record<string, unknown> = { companyAppId: appId as string }
  if (address) where.walletAddress = address as string
  if (status) where.status = status as string

  const rows = await prisma.leaveRequest.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 })
  res.json(rows)
})

router.post('/leave-requests/:id/approve', requireAuth('employer'), async (req, res) => {
  const { actorAddress } = req.body as { actorAddress?: string }
  const safeActor = typeof actorAddress === 'string' ? actorAddress : null
  try {
    const updated = await prisma.leaveRequest.update({
      where: { id: String(req.params.id) },
      data: { status: 'approved', reviewer: safeActor, reviewedAt: new Date() },
    })
    res.json(updated)
  } catch {
    res.status(404).json({ error: 'Leave request not found' })
  }
})

router.post('/leave-requests/:id/reject', requireAuth('employer'), async (req, res) => {
  const { actorAddress } = req.body as { actorAddress?: string }
  const safeActor = typeof actorAddress === 'string' ? actorAddress : null
  try {
    const updated = await prisma.leaveRequest.update({
      where: { id: String(req.params.id) },
      data: { status: 'rejected', reviewer: safeActor, reviewedAt: new Date() },
    })
    res.json(updated)
  } catch {
    res.status(404).json({ error: 'Leave request not found' })
  }
})

export default router

