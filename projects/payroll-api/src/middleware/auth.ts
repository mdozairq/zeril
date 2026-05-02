import type { Request, Response, NextFunction } from 'express'
import { verifyToken, type AuthClaims, type AuthRole } from '../auth/jwt.js'
import { prisma } from '../db.js'

export type AuthedRequest = Request & { auth?: AuthClaims }

export function authOptional(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (token) {
    try {
      req.auth = verifyToken(token)
    } catch {
      // ignore invalid tokens for optional auth
      req.auth = undefined
    }
  }
  next()
}

export function requireAuth(role?: AuthRole) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.header('Authorization') || ''
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
    if (!token) {
      res.status(401).json({ error: 'Missing Authorization bearer token' })
      return
    }
    try {
      const claims = verifyToken(token)
      if (role && claims.role !== role) {
        res.status(403).json({ error: 'Forbidden' })
        return
      }
      req.auth = claims
      next()
    } catch (e) {
      res.status(401).json({ error: e instanceof Error ? e.message : 'Invalid token' })
    }
  }
}

export async function requireCompanyAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const appId = String(req.params.appId || req.body.companyAppId || '')
  if (!appId) {
    res.status(400).json({ error: 'Missing appId' })
    return
  }
  const company = await prisma.company.findUnique({ where: { appId } })
  if (!company?.adminAddress) {
    res.status(403).json({ error: 'Company admin not configured' })
    return
  }
  if (company.adminAddress !== req.auth.sub) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

export function requireSelfAddress(paramName: 'address' | 'walletAddress' = 'address') {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const target = String((req.params as any)[paramName] || (req.body as any)[paramName] || '')
    if (!target || target !== req.auth.sub) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}

