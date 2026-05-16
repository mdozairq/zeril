import { Router } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import { prisma } from '../db.js'
import { requireAuth, requireCompanyAdmin, requireSelfAddress } from '../middleware/auth.js'
import { uploadToPinata, buildPinataFetchUrl, buildPinataViewUrl, isPinataConfigured } from '../lib/pinata.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

type KycDocInput = {
  docType: string
  sha256: string
  country?: string
  issuedAt?: string
  expiresAt?: string
  reference?: string
  pinataCid?: string
  fileUrl?: string
}

const router = Router({ mergeParams: true })

function mapStatusToEmployeeKyc(status: string) {
  if (status === 'approved') return 'approved'
  if (status === 'rejected') return 'rejected'
  if (status === 'submitted') return 'submitted'
  return 'pending'
}

function mapStatusToEmployment(status: string) {
  if (status === 'approved') return 'kyc_approved'
  if (status === 'rejected') return 'rejected'
  if (status === 'submitted') return 'kyc_submitted'
  return 'pending_kyc'
}

async function getEmployeeOr404(appId: string, address: string) {
  return prisma.employeeMeta.findUnique({
    where: { companyAppId_walletAddress: { companyAppId: appId, walletAddress: address } },
  })
}

/** Stream a pinned KYC file through the API (avoids Pinata gateway CORS / token issues in browser). */
router.get('/kyc/ipfs/:cid', async (req, res) => {
  const cid = String(req.params.cid || '').trim()
  if (!cid || cid.length < 10) {
    res.status(400).json({ error: 'Invalid cid' })
    return
  }
  if (!isPinataConfigured()) {
    res.status(404).json({ error: 'Document not on IPFS (Pinata not configured or dev mock upload)' })
    return
  }

  try {
    const gatewayUrl = buildPinataFetchUrl(cid)
    const headers: Record<string, string> = {}
    const jwt = process.env.PINATA_JWT
    if (jwt) headers.Authorization = `Bearer ${jwt}`

    const upstream = await fetch(gatewayUrl, { headers })
    if (!upstream.ok) {
      const body = await upstream.text().catch(() => '')
      res.status(upstream.status).json({
        error: `Pinata gateway error: ${upstream.status}`,
        detail: body.slice(0, 500),
      })
      return
    }

    const contentType = upstream.headers.get('content-type')
    if (contentType) res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    const buf = Buffer.from(await upstream.arrayBuffer())
    res.send(buf)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch document'
    res.status(500).json({ error: msg })
  }
})

router.post('/kyc/upload', upload.single('file'), async (req, res) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }

  try {
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex')
    const result = await uploadToPinata(file.buffer, file.originalname)
    const viewUrl = buildPinataViewUrl(result.cid)
    const apiViewUrl = `/api/kyc/ipfs/${result.cid}`
    res.json({
      sha256,
      cid: result.cid,
      url: viewUrl || apiViewUrl,
      apiViewUrl,
      fileName: file.originalname,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload failed'
    res.status(500).json({ error: msg })
  }
})

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
          pinataCid: d.pinataCid ?? null,
          fileUrl: d.fileUrl ?? null,
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
    data: {
      kycStatus: mapStatusToEmployeeKyc(updated.status),
      employmentStatus: mapStatusToEmployment(updated.status),
    },
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
    data: {
      kycStatus: mapStatusToEmployeeKyc(updated.status),
      employmentStatus: mapStatusToEmployment(updated.status),
    },
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
    data: {
      kycStatus: mapStatusToEmployeeKyc(updated.status),
      employmentStatus: mapStatusToEmployment(updated.status),
    },
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

