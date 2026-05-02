import { prisma } from '../db.js'
import { wormholeBridgeSandbox } from './wormholeClient.js'
import { saberOfframpSandbox } from './saberClient.js'

export async function runOfframpOrchestrator(requestId: string) {
  const req = await prisma.offrampRequest.findUnique({ where: { id: requestId } })
  if (!req) throw new Error('OfframpRequest not found')

  // Idempotent: if already completed/failed, do nothing
  if (req.status === 'completed' || req.status === 'failed') return req

  try {
    await prisma.offrampRequest.update({
      where: { id: requestId },
      data: { status: 'bridging', lastError: null },
    })

    const bridge = await wormholeBridgeSandbox({
      companyAppId: req.companyAppId,
      employeeWalletAddress: req.employeeWalletAddress,
      amountUsdcMicrounits: req.amountUsdcMicrounits,
      idempotencyKey: req.idempotencyKey,
    })

    await prisma.offrampRequest.update({
      where: { id: requestId },
      data: { bridgeRef: bridge.bridgeRef, status: 'offramp_pending' },
    })

    const off = await saberOfframpSandbox({
      companyAppId: req.companyAppId,
      employeeWalletAddress: req.employeeWalletAddress,
      amountUsdcMicrounits: req.amountUsdcMicrounits,
      bridgeRef: bridge.bridgeRef,
      idempotencyKey: req.idempotencyKey,
    })

    const updated = await prisma.offrampRequest.update({
      where: { id: requestId },
      data: { offrampRef: off.offrampRef, status: 'completed' },
    })

    await prisma.auditLog.create({
      data: {
        companyAppId: updated.companyAppId,
        action: 'offramp_completed',
        actorAddress: updated.employeeWalletAddress,
        entityType: 'offramp_request',
        entityId: updated.id,
        metadata: JSON.stringify({ bridgeRef: updated.bridgeRef, offrampRef: updated.offrampRef }),
      },
    })

    return updated
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    const updated = await prisma.offrampRequest.update({
      where: { id: requestId },
      data: { status: 'failed', lastError: msg, retries: { increment: 1 } },
    })
    await prisma.auditLog.create({
      data: {
        companyAppId: updated.companyAppId,
        action: 'offramp_failed',
        actorAddress: updated.employeeWalletAddress,
        entityType: 'offramp_request',
        entityId: updated.id,
        metadata: JSON.stringify({ error: msg }),
      },
    })
    return updated
  }
}

