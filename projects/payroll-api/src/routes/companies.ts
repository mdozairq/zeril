import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

router.post('/', async (req, res) => {
  const { appId, name, network, treasuryAsset } = req.body
  if (!appId || !name) {
    res.status(400).json({ error: 'appId and name are required' })
    return
  }

  const company = await prisma.company.upsert({
    where: { appId },
    update: { name, network, treasuryAsset },
    create: { appId, name, network: network || 'testnet', treasuryAsset: treasuryAsset || 'USDC' },
  })
  res.json(company)
})

router.get('/:appId', async (req, res) => {
  const company = await prisma.company.findUnique({
    where: { appId: req.params.appId },
    include: { employees: true },
  })
  if (!company) {
    res.status(404).json({ error: 'Company not found' })
    return
  }
  res.json(company)
})

router.get('/:appId/employees', async (req, res) => {
  const employees = await prisma.employeeMeta.findMany({
    where: { companyAppId: req.params.appId },
    orderBy: { createdAt: 'desc' },
  })
  res.json(employees)
})

router.post('/:appId/employees', async (req, res) => {
  const { walletAddress, name, network, settlementType, country, bankDetails } = req.body
  if (!walletAddress) {
    res.status(400).json({ error: 'walletAddress is required' })
    return
  }

  const company = await prisma.company.findUnique({ where: { appId: req.params.appId } })
  if (!company) {
    res.status(404).json({ error: 'Company not found. Create company first.' })
    return
  }

  const employee = await prisma.employeeMeta.upsert({
    where: {
      companyAppId_walletAddress: {
        companyAppId: req.params.appId,
        walletAddress,
      },
    },
    update: { name, network, settlementType, country, bankDetails },
    create: {
      companyAppId: req.params.appId,
      walletAddress,
      name: name || 'Unnamed',
      network: network || 'algorand',
      settlementType: settlementType || 'crypto',
      country,
      bankDetails,
    },
  })
  res.json(employee)
})

router.put('/:appId/employees/:address', async (req, res) => {
  const { name, network, settlementType, country, kycStatus, bankDetails } = req.body

  try {
    const employee = await prisma.employeeMeta.update({
      where: {
        companyAppId_walletAddress: {
          companyAppId: req.params.appId,
          walletAddress: req.params.address,
        },
      },
      data: {
        ...(name !== undefined && { name }),
        ...(network !== undefined && { network }),
        ...(settlementType !== undefined && { settlementType }),
        ...(country !== undefined && { country }),
        ...(kycStatus !== undefined && { kycStatus }),
        ...(bankDetails !== undefined && { bankDetails }),
      },
    })
    res.json(employee)
  } catch {
    res.status(404).json({ error: 'Employee not found' })
  }
})

router.delete('/:appId/employees/:address', async (req, res) => {
  try {
    await prisma.employeeMeta.delete({
      where: {
        companyAppId_walletAddress: {
          companyAppId: req.params.appId,
          walletAddress: req.params.address,
        },
      },
    })
    res.json({ success: true })
  } catch {
    res.status(404).json({ error: 'Employee not found' })
  }
})

export default router
