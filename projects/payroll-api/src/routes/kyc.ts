import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth, requireCompanyAdmin, requireSelfAddress } from '../middleware/auth.js'

type KycDocInput = {
  docType: string
  sha256: string
  country?: string
  issuedAt?: string
  expiresAt?: string
  reference?: string
}

const router = Router({ mergeParams: true })

function mapStatusToEmployeeKyc(status: string) {
  if (status === 'approved') return 'approved'
  if (status === 'rejected') return 'rejected'
  if (status === 'submitted') return 'submitted'
  return 'pending'
}

async function getEmployeeOr404(appId: string, address: string) {
  return prisma.employeeMeta.findUnique({
    where: { companyAppId_walletAddress: { companyAppId: appId, walletAddress: address } },
  })
}

router.get('/companies/:appId/employees/:address/kyc', async (req, res) => {
  const appId = String(req.params.appId)
  const address = String(req.params.address)

  const employee = await getEmployeeOr404(appId, address)
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' })
    return
  }

  const latestCase = await prisma.kycCase.findFirst({
    where: { employeeId: employee.id, companyAppId: appId },
    orderBy: { createdAt: 'desc' },
    include: { documents: true },
  })

  res.json({ employee, kycCase: latestCase })
})

router.post('/companies/:appId/employees/:address/kyc', async (req, res) => {
  const appId = String(req.params.appId)
  const address = String(req.params.address)
  const { nationality, documents } = req.body as { nationality?: string; documents?: KycDocInput[] }

  const employee = await getEmployeeOr404(appId, address)
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' })
    return
  }

  const latestCase = await prisma.kycCase.findFirst({
    where: { employeeId: employee.id, companyAppId: appId },
    orderBy: { createdAt: 'desc' },
  })

  const canEdit = !latestCase || latestCase.status === 'draft' || latestCase.status === 'rejected'
  if (!canEdit) {
    res.status(409).json({ error: `KYC case is ${latestCase?.status}; cannot edit.` })
    return
  }

  const kycCase = latestCase && (latestCase.status === 'draft' || latestCase.status === 'rejected')
    ? await prisma.kycCase.update({
        where: { id: latestCase.id },
        data: { nationality: nationality ?? latestCase.nationality ?? null, status: 'draft' },
      })
    : await prisma.kycCase.create({
        data: {
          companyAppId: appId,
          employeeId: employee.id,
          status: 'draft',
          nationality: nationality ?? null,
        },
      })

  if (Array.isArray(documents)) {
    await prisma.kycDocument.deleteMany({ where: { caseId: kycCase.id } })
    if (documents.length > 0) {
      await prisma.kycDocument.createMany({
        data: documents.map((d) => ({
          caseId: kycCase.id,
          docType: d.docType,
          sha256: d.sha256,
          country: d.country ?? null,
          issuedAt: d.issuedAt ? new Date(d.issuedAt) : null,
          expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
          reference: d.reference ?? null,
        })),
      })
    }
  }

  const withDocs = await prisma.kycCase.findUnique({
    where: { id: kycCase.id },
    include: { documents: true },
  })

  res.status(201).json(withDocs)
})

router.post('/companies/:appId/employees/:address/kyc/submit', requireAuth('employee'), requireSelfAddress('address'), async (req, res) => {
  const appId = String(req.params.appId)
  const address = String(req.params.address)
  const { actorAddress } = req.body as { actorAddress?: string }
  const safeActor = typeof actorAddress === 'string' ? actorAddress : undefined

  const employee = await getEmployeeOr404(appId, address)
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' })
    return
  }

  const latestCase = await prisma.kycCase.findFirst({
    where: { employeeId: employee.id, companyAppId: appId },
    orderBy: { createdAt: 'desc' },
  })
  if (!latestCase) {
    res.status(404).json({ error: 'No KYC case found' })
    return
  }
  if (latestCase.status !== 'draft' && latestCase.status !== 'rejected') {
    res.status(409).json({ error: `KYC case is ${latestCase.status}; cannot submit.` })
    return
  }

  const updated = await prisma.kycCase.update({
    where: { id: latestCase.id },
    data: { status: 'submitted', submittedAt: new Date() },
    include: { documents: true },
  })

  await prisma.employeeMeta.update({
    where: { id: employee.id },
    data: { kycStatus: mapStatusToEmployeeKyc(updated.status) },
  })

  if (safeActor) {
    await prisma.auditLog.create({
      data: {
        companyAppId: appId,
        action: 'kyc_submitted',
        actorAddress: safeActor,
        entityType: 'employee',
        entityId: address,
        metadata: JSON.stringify({ caseId: updated.id }),
      },
    })
  }

  res.json(updated)
})

router.post('/companies/:appId/employees/:address/kyc/approve', requireAuth('employer'), requireCompanyAdmin, async (req, res) => {
  const appId = String(req.params.appId)
  const address = String(req.params.address)
  const { actorAddress } = req.body as { actorAddress?: string }
  const safeActor = typeof actorAddress === 'string' ? actorAddress : undefined

  const employee = await getEmployeeOr404(appId, address)
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' })
    return
  }

  const latestCase = await prisma.kycCase.findFirst({
    where: { employeeId: employee.id, companyAppId: appId },
    orderBy: { createdAt: 'desc' },
  })
  if (!latestCase) {
    res.status(404).json({ error: 'No KYC case found' })
    return
  }
  if (latestCase.status !== 'submitted') {
    res.status(409).json({ error: `KYC case is ${latestCase.status}; cannot approve.` })
    return
  }

  const updated = await prisma.kycCase.update({
    where: { id: latestCase.id },
    data: { status: 'approved', reviewedAt: new Date(), reviewer: safeActor ?? null },
    include: { documents: true },
  })

  await prisma.employeeMeta.update({
    where: { id: employee.id },
    data: { kycStatus: mapStatusToEmployeeKyc(updated.status) },
  })

  if (safeActor) {
    await prisma.auditLog.create({
      data: {
        companyAppId: appId,
        action: 'kyc_approved',
        actorAddress: safeActor,
        entityType: 'employee',
        entityId: address,
        metadata: JSON.stringify({ caseId: updated.id }),
      },
    })
  }

  res.json(updated)
})

router.post('/companies/:appId/employees/:address/kyc/reject', requireAuth('employer'), requireCompanyAdmin, async (req, res) => {
  const appId = String(req.params.appId)
  const address = String(req.params.address)
  const { actorAddress, rejectionNote } = req.body as { actorAddress?: string; rejectionNote?: string }
  const safeActor = typeof actorAddress === 'string' ? actorAddress : undefined

  const employee = await getEmployeeOr404(appId, address)
  if (!employee) {
    res.status(404).json({ error: 'Employee not found' })
    return
  }

  const latestCase = await prisma.kycCase.findFirst({
    where: { employeeId: employee.id, companyAppId: appId },
    orderBy: { createdAt: 'desc' },
  })
  if (!latestCase) {
    res.status(404).json({ error: 'No KYC case found' })
    return
  }
  if (latestCase.status !== 'submitted') {
    res.status(409).json({ error: `KYC case is ${latestCase.status}; cannot reject.` })
    return
  }

  const updated = await prisma.kycCase.update({
    where: { id: latestCase.id },
    data: {
      status: 'rejected',
      reviewedAt: new Date(),
      reviewer: safeActor ?? null,
      rejectionNote: rejectionNote ?? null,
    },
    include: { documents: true },
  })

  await prisma.employeeMeta.update({
    where: { id: employee.id },
    data: { kycStatus: mapStatusToEmployeeKyc(updated.status) },
  })

  if (safeActor) {
    await prisma.auditLog.create({
      data: {
        companyAppId: appId,
        action: 'kyc_rejected',
        actorAddress: safeActor,
        entityType: 'employee',
        entityId: address,
        metadata: JSON.stringify({ caseId: updated.id, rejectionNote }),
      },
    })
  }

  res.json(updated)
})

export default router

