import { Router } from 'express'
import { prisma } from '../db.js'
import { calculateTax } from '../lib/tax.js'

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

router.post('/:id/payments', async (req, res) => {
  const { employeeAddress, grossAmount, countryCode, txHash } = req.body as {
    employeeAddress?: string
    grossAmount?: number
    countryCode?: string
    txHash?: string
  }

  if (!employeeAddress || grossAmount === undefined) {
    res.status(400).json({ error: 'employeeAddress and grossAmount required' })
    return
  }

  const run = await prisma.payrollRun.findUnique({ where: { id: req.params.id } })
  if (!run) {
    res.status(404).json({ error: 'Payroll run not found' })
    return
  }

  const tax = calculateTax(grossAmount, countryCode)

  const payment = await prisma.payment.create({
    data: {
      payrollRunId: run.id,
      employeeAddress,
      grossAmount: String(grossAmount),
      taxWithheld: String(tax.totalTax),
      netAmount: String(tax.netAmount),
      countryCode: countryCode || null,
      tdsAmount: String(tax.tds),
      socialSecurity: String(tax.socialSecurity),
      surcharge: String(tax.surcharge),
      effectiveRate: String(tax.effectiveRate),
      txHash: txHash || null,
      status: txHash ? 'completed' : 'pending',
    },
  })

  res.status(201).json(payment)
})

router.patch('/:runId/payments/:paymentId', async (req, res) => {
  const { txHash, status } = req.body
  const data: Record<string, unknown> = {}
  if (txHash !== undefined) data.txHash = txHash
  if (status !== undefined) data.status = status

  try {
    const payment = await prisma.payment.update({
      where: { id: req.params.paymentId },
      data,
    })
    res.json(payment)
  } catch {
    res.status(404).json({ error: 'Payment not found' })
  }
})

router.get('/:id/payments', async (req, res) => {
  const payments = await prisma.payment.findMany({
    where: { payrollRunId: req.params.id },
    orderBy: { createdAt: 'desc' },
  })
  res.json(payments)
})

router.get('/:id/payslips', async (req, res) => {
  const run = await prisma.payrollRun.findUnique({
    where: { id: req.params.id },
    include: { company: true, payments: true },
  })
  if (!run) {
    res.status(404).json({ error: 'Payroll run not found' })
    return
  }

  const employeeAddresses = run.payments.map(p => p.employeeAddress)
  const employees = await prisma.employeeMeta.findMany({
    where: {
      companyAppId: run.companyAppId,
      walletAddress: { in: employeeAddresses },
    },
  })
  const empMap = new Map(employees.map(e => [e.walletAddress, e]))

  const payslips = run.payments.map(p => {
    const emp = empMap.get(p.employeeAddress)
    return {
      paymentId: p.id,
      payrollRunId: run.id,
      payrollRunName: run.name,
      runDate: run.createdAt,
      company: {
        name: run.company.name,
        appId: run.companyAppId,
        network: run.company.network,
      },
      employee: {
        name: emp?.name || 'Unknown',
        walletAddress: p.employeeAddress,
        country: p.countryCode || emp?.country || null,
        dbId: emp?.id || null,
      },
      grossAmount: p.grossAmount,
      taxWithheld: p.taxWithheld,
      netAmount: p.netAmount,
      breakdown: {
        tds: p.tdsAmount || '0',
        socialSecurity: p.socialSecurity || '0',
        surcharge: p.surcharge || '0',
        effectiveRate: p.effectiveRate || '0',
      },
      txHash: p.txHash,
      status: p.status,
    }
  })

  res.json(payslips)
})

router.get('/employee/:address/payslips', async (req, res) => {
  const { appId } = req.query
  if (!appId) {
    res.status(400).json({ error: 'appId query parameter required' })
    return
  }

  const payments = await prisma.payment.findMany({
    where: { employeeAddress: req.params.address, payrollRun: { companyAppId: appId as string } },
    include: { payrollRun: { include: { company: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const emp = await prisma.employeeMeta.findFirst({
    where: { companyAppId: appId as string, walletAddress: req.params.address },
  })

  const payslips = payments.map(p => ({
    paymentId: p.id,
    payrollRunId: p.payrollRun.id,
    payrollRunName: p.payrollRun.name,
    runDate: p.payrollRun.createdAt,
    company: {
      name: p.payrollRun.company.name,
      appId: p.payrollRun.companyAppId,
      network: p.payrollRun.company.network,
    },
    employee: {
      name: emp?.name || 'Unknown',
      walletAddress: p.employeeAddress,
      country: p.countryCode || emp?.country || null,
      dbId: emp?.id || null,
    },
    grossAmount: p.grossAmount,
    taxWithheld: p.taxWithheld,
    netAmount: p.netAmount,
    breakdown: {
      tds: p.tdsAmount || '0',
      socialSecurity: p.socialSecurity || '0',
      surcharge: p.surcharge || '0',
      effectiveRate: p.effectiveRate || '0',
    },
    txHash: p.txHash,
    status: p.status,
  }))

  res.json(payslips)
})

export default router
