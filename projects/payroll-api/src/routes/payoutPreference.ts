import { Router } from 'express'
import { prisma } from '../db.js'
import algosdk from 'algosdk'

const router = Router()

router.put('/companies/:appId/employees/:address/payout-preference', async (req, res) => {
  const { appId, address } = req.params
  const { payoutMethod, cryptoAddress, cryptoNetwork } = req.body as {
    payoutMethod?: 'crypto' | 'bank'
    cryptoAddress?: string
    cryptoNetwork?: string
  }

  const employee = await prisma.employeeMeta.findUnique({
    where: { companyAppId_walletAddress: { companyAppId: appId, walletAddress: address } },
  })
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' })
    return
  }

  if (payoutMethod === 'crypto') {
    const addr = (cryptoAddress ?? '').trim()
    if (!addr) {
      res.status(400).json({ error: 'cryptoAddress is required for crypto payout' })
      return
    }
    const net = (cryptoNetwork ?? 'algorand').trim()
    if (net !== 'algorand') {
      res.status(400).json({ error: 'Only cryptoNetwork=algorand is supported in this version' })
      return
    }
    if (!algosdk.isValidAddress(addr)) {
      res.status(400).json({ error: 'Invalid Algorand address' })
      return
    }
  }

  const updated = await prisma.employeeMeta.update({
    where: { id: employee.id },
    data: {
      ...(payoutMethod !== undefined && { payoutMethod }),
      ...(cryptoAddress !== undefined && { cryptoAddress }),
      ...(cryptoNetwork !== undefined && { cryptoNetwork }),
    },
  })

  res.json(updated)
})

export default router

