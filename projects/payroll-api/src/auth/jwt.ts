import jwt from 'jsonwebtoken'

export type AuthRole = 'employer' | 'employee'

export type AuthClaims = {
  sub: string // wallet address
  role: AuthRole
}

function secret() {
  return process.env.JWT_SECRET || 'dev_insecure_secret_change_me'
}

export function signToken(claims: AuthClaims) {
  return jwt.sign(claims, secret(), { expiresIn: '8h' })
}

export function verifyToken(token: string): AuthClaims {
  const decoded = jwt.verify(token, secret()) as jwt.JwtPayload
  const sub = String(decoded.sub || '')
  const role = String((decoded as any).role || '') as AuthRole
  if (!sub || (role !== 'employer' && role !== 'employee')) throw new Error('Invalid token')
  return { sub, role }
}

