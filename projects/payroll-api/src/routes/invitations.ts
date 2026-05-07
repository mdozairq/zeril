import { Router } from 'express'
import { prisma } from '../db.js'
import { randomInviteCode, sha256Hex } from '../utils/crypto.js'
import { renderInviteEmail, sendEmailSandbox } from '../utils/mailer.js'
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js'

const router = Router()

router.post('/companies/:appId/invitations', requireAuth('employer'), requireCompanyAdmin, async (req, res) => {
  const appId = String(req.params.appId)
  const { email, expiresInDays, actorAddress } = req.body as { email?: string; expiresInDays?: number; actorAddress?: string }
  const safeEmail = typeof email === 'string' ? email : ''
  const safeActor = typeof actorAddress === 'string' ? actorAddress : undefined

  if (!safeEmail) {
    res.status(400).json({ error: 'email is required' })
    return
  }

  const company = await prisma.company.findUnique({ where: { appId } })
  if (!company) {
    res.status(404).json({ error: 'Company not found' })
    return
  }

  const inviteCode = randomInviteCode()
  const codeHash = sha256Hex(inviteCode)
  const expiresAt = new Date(Date.now() + (Math.max(1, Math.min(expiresInDays ?? 7, 30)) * 24 * 60 * 60 * 1000))

  const invite = await prisma.invitation.create({
    data: {
      companyAppId: appId,
      email: safeEmail,
      code: inviteCode,
      codeHash,
      expiresAt,
    },
  })

  const html = renderInviteEmail({ companyName: company.name, inviteCode, expiresAtIso: expiresAt.toISOString() })
  await sendEmailSandbox({ to: safeEmail, subject: `Your Zeril invite to ${company.name}`, html })

  if (safeActor) {
    await prisma.auditLog.create({
      data: {
        companyAppId: appId,
        action: 'invite_created',
        actorAddress: safeActor,
        entityType: 'invitation',
        entityId: invite.id,
        metadata: JSON.stringify({ email: safeEmail }),
      },
    })
  }

  // Return invite code only once.
  res.status(201).json({ id: invite.id, email: safeEmail, expiresAt: invite.expiresAt, inviteCode })
})

router.get('/companies/:appId/invitations', async (req, res) => {
  const appId = String(req.params.appId)
  const invitations = await prisma.invitation.findMany({
    where: { companyAppId: appId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  res.json(invitations.map(inv => ({
    id: inv.id,
    email: inv.email,
    code: inv.code,
    expiresAt: inv.expiresAt,
    acceptedAt: inv.acceptedAt,
    employeeWalletAddress: inv.employeeWalletAddress,
    createdAt: inv.createdAt,
  })))
})

router.get('/invitations/:code', async (req, res) => {
  const code = req.params.code
  const codeHash = sha256Hex(code)

  const invite = await prisma.invitation.findUnique({ where: { codeHash } })
  if (!invite) {
    res.status(404).json({ error: 'Invitation not found' })
    return
  }

  if (invite.acceptedAt) {
    res.status(409).json({ error: 'Invitation already accepted' })
    return
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    res.status(410).json({ error: 'Invitation expired' })
    return
  }

  const company = await prisma.company.findUnique({ where: { appId: invite.companyAppId } })
  res.json({
    companyAppId: invite.companyAppId,
    companyName: company?.name ?? 'Company',
    email: invite.email,
    expiresAt: invite.expiresAt,
  })
})

router.post('/invitations/:code/accept', async (req, res) => {
  const code = req.params.code
  const codeHash = sha256Hex(code)
  const { walletAddress, name, actorAddress } = req.body as { walletAddress?: string; name?: string; actorAddress?: string }

  if (!walletAddress) {
    res.status(400).json({ error: 'walletAddress is required' })
    return
  }

  const invite = await prisma.invitation.findUnique({ where: { codeHash } })
  if (!invite) {
    res.status(404).json({ error: 'Invitation not found' })
    return
  }
  if (invite.acceptedAt) {
    res.status(409).json({ error: 'Invitation already accepted' })
    return
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    res.status(410).json({ error: 'Invitation expired' })
    return
  }

  await prisma.invitation.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date(), employeeWalletAddress: walletAddress },
  })

  // Link invited email to the employee record.
  const employee = await prisma.employeeMeta.upsert({
    where: {
      companyAppId_walletAddress: {
        companyAppId: invite.companyAppId,
        walletAddress,
      },
    },
    update: {
      email: invite.email,
      ...(name ? { name } : {}),
    },
    create: {
      companyAppId: invite.companyAppId,
      walletAddress,
      email: invite.email,
      name: name || 'Unnamed',
      network: 'algorand',
      settlementType: 'crypto',
    },
  })

  // Ensure baseline onboarding checklist exists (company-scoped).
  const defaults = [
    { key: 'connect_wallet', title: 'Connect wallet', sortOrder: 10 },
    { key: 'set_allocation', title: 'Set salary allocation', sortOrder: 20 },
    { key: 'submit_kyc', title: 'Submit KYC', sortOrder: 30 },
  ]
  for (const item of defaults) {
    await prisma.onboardingChecklistItem.upsert({
      where: { companyAppId_key: { companyAppId: invite.companyAppId, key: item.key } },
      update: {},
      create: {
        companyAppId: invite.companyAppId,
        key: item.key,
        title: item.title,
        sortOrder: item.sortOrder,
        isRequired: true,
      },
    })
  }

  if (actorAddress) {
    await prisma.auditLog.create({
      data: {
        companyAppId: invite.companyAppId,
        action: 'invite_accepted',
        actorAddress,
        entityType: 'employee',
        entityId: walletAddress,
        metadata: JSON.stringify({ email: invite.email }),
      },
    })
  }

  res.json({ success: true, companyAppId: invite.companyAppId, employee })
})

router.get('/companies/:appId/onboarding/:address', async (req, res) => {
  const { appId, address } = req.params

  const items = await prisma.onboardingChecklistItem.findMany({
    where: { companyAppId: appId },
    orderBy: { sortOrder: 'asc' },
  })
  const statuses = await prisma.employeeOnboardingStatus.findMany({
    where: { companyAppId: appId, walletAddress: address },
  })
  const statusMap = new Map(statuses.map((s) => [s.itemKey, s.completedAt]))

  res.json({
    items: items.map((i) => ({
      key: i.key,
      title: i.title,
      isRequired: i.isRequired,
      completedAt: statusMap.get(i.key) ?? null,
    })),
  })
})

router.put('/companies/:appId/onboarding/:address', async (req, res) => {
  const { appId, address } = req.params
  const { itemKey, completed, actorAddress } = req.body as { itemKey?: string; completed?: boolean; actorAddress?: string }

  if (!itemKey) {
    res.status(400).json({ error: 'itemKey is required' })
    return
  }

  const status = await prisma.employeeOnboardingStatus.upsert({
    where: { companyAppId_walletAddress_itemKey: { companyAppId: appId, walletAddress: address, itemKey } },
    update: { completedAt: completed ? new Date() : null },
    create: { companyAppId: appId, walletAddress: address, itemKey, completedAt: completed ? new Date() : null },
  })

  if (actorAddress) {
    await prisma.auditLog.create({
      data: {
        companyAppId: appId,
        action: completed ? 'onboarding_item_completed' : 'onboarding_item_uncompleted',
        actorAddress,
        entityType: 'employee',
        entityId: address,
        metadata: JSON.stringify({ itemKey }),
      },
    })
  }

  res.json(status)
})

export default router

