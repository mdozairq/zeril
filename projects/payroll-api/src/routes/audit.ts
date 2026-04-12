import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

router.post('/', async (req, res) => {
  const { companyAppId, action, actorAddress, entityType, entityId, metadata } = req.body
  if (!companyAppId || !action || !actorAddress) {
    res.status(400).json({ error: 'companyAppId, action, and actorAddress are required' })
    return
  }

  const log = await prisma.auditLog.create({
    data: {
      companyAppId,
      action,
      actorAddress,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  })
  res.status(201).json(log)
})

router.get('/', async (req, res) => {
  const { appId, action, from, to, limit } = req.query

  if (!appId) {
    res.status(400).json({ error: 'appId query parameter is required' })
    return
  }

  const where: Record<string, unknown> = { companyAppId: appId as string }

  if (action) {
    where.action = action as string
  }

  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(from as string) }),
      ...(to && { lte: new Date(to as string) }),
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit) || 100, 500),
  })
  res.json(logs)
})

export default router
