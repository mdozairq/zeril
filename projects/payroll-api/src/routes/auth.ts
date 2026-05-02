import { Router } from 'express'
import algosdk from 'algosdk'
import { createChallenge, consumeChallenge } from '../auth/challengeStore.js'
import { signToken, type AuthRole } from '../auth/jwt.js'

const router = Router()

router.get('/auth/challenge', async (req, res) => {
  const address = String(req.query.address || '')
  const role = String(req.query.role || '') as AuthRole
  if (!address || (role !== 'employer' && role !== 'employee')) {
    res.status(400).json({ error: 'address and role are required' })
    return
  }
  if (!algosdk.isValidAddress(address)) {
    res.status(400).json({ error: 'Invalid address' })
    return
  }

  const c = createChallenge(address)
  res.json({
    address,
    role,
    nonce: c.nonce,
    expiresAt: new Date(c.expiresAtMs).toISOString(),
    notePrefix: 'zeril-auth',
  })
})

router.post('/auth/verify', async (req, res) => {
  const { address, role, nonce, signedTxnB64 } = req.body as {
    address?: string
    role?: AuthRole
    nonce?: string
    signedTxnB64?: string
  }
  if (!address || !role || !nonce || !signedTxnB64) {
    res.status(400).json({ error: 'address, role, nonce, signedTxnB64 are required' })
    return
  }

  const c = consumeChallenge(address, nonce)
  if (!c) {
    res.status(401).json({ error: 'Invalid or expired challenge' })
    return
  }

  const signedBytes = Buffer.from(signedTxnB64, 'base64')
  const decoded = algosdk.decodeSignedTransaction(new Uint8Array(signedBytes))
  const txn = decoded.txn

  const senderBytes =
    (txn as any).sender?.publicKey ??
    (txn as any).sender ??
    (txn as any).from?.publicKey ??
    (txn as any).from
  const sender = algosdk.encodeAddress(senderBytes)
  if (sender !== address) {
    res.status(401).json({ error: 'Signed transaction sender mismatch' })
    return
  }

  const note = txn.note ? Buffer.from(txn.note).toString('utf8') : ''
  const expected = `zeril-auth:${nonce}`
  if (note !== expected) {
    res.status(401).json({ error: 'Invalid auth note' })
    return
  }

  const unsignedBytes = algosdk.encodeUnsignedTransaction(txn)
  const pk = senderBytes
  const sig = decoded.sig
  if (!sig || !algosdk.verifyBytes(unsignedBytes, sig, pk)) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  const token = signToken({ sub: address, role })
  res.json({ token, address, role })
})

export default router

