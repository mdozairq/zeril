import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

router.get('/', async (_req, res) => {
  const docs = await prisma.complianceDocument.findMany({
    where: { isActive: true },
    orderBy: [{ key: 'asc' }, { version: 'desc' }],
  })
  res.json(docs)
})

export default router

