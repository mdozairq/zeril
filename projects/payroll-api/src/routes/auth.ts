import { Router } from 'express'
import algosdk from 'algosdk'
import nacl from 'tweetnacl'
import { createChallenge, consumeChallenge } from '../auth/challengeStore.js'
import { signToken, type AuthRole } from '../auth/jwt.js'
import { normalizeAddress, sameAddress } from '../auth/addresses.js'

const router = Router()

function transactionSenderAddress(txn: algosdk.Transaction): string {
  const raw = txn.sender as unknown
  if (typeof raw === 'string') return normalizeAddress(raw)
  if (raw instanceof Uint8Array) return algosdk.encodeAddress(raw)
  if (raw && typeof raw === 'object' && 'publicKey' in raw) {
    const pk = (raw as { publicKey: Uint8Array }).publicKey
    if (pk instanceof Uint8Array) return algosdk.encodeAddress(pk)
  }
  return normalizeAddress(String(raw))
}

router.get('/auth/challenge', async (req, res) => {
  const addressRaw = String(req.query.address || '')
  const role = String(req.query.role || '') as AuthRole
  if (!addressRaw || (role !== 'employer' && role !== 'employee')) {
    res.status(400).json({ error: 'address and role are required' })
    return
  }
  if (!algosdk.isValidAddress(addressRaw)) {
    res.status(400).json({ error: 'Invalid address' })
    return
  }

  const address = normalizeAddress(addressRaw)
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
  const { address: addressRaw, role, nonce, signedTxnB64 } = req.body as {
    address?: string
    role?: AuthRole
    nonce?: string
    signedTxnB64?: string
  }
  if (!addressRaw || !role || !nonce || !signedTxnB64) {
    res.status(400).json({ error: 'address, role, nonce, signedTxnB64 are required' })
    return
  }
  if (!algosdk.isValidAddress(addressRaw)) {
    res.status(400).json({ error: 'Invalid address' })
    return
  }

  const address = normalizeAddress(addressRaw)

  const c = consumeChallenge(address, nonce)
  if (!c) {
    res.status(401).json({ error: 'Invalid or expired challenge' })
    return
  }

  let signedBytes: Uint8Array
  try {
    signedBytes = new Uint8Array(Buffer.from(signedTxnB64, 'base64'))
  } catch {
    res.status(400).json({ error: 'Invalid signedTxnB64' })
    return
  }

  let decoded: algosdk.SignedTransaction
  try {
    decoded = algosdk.decodeSignedTransaction(signedBytes)
  } catch {
    res.status(401).json({ error: 'Invalid signed transaction' })
    return
  }

  const txn = decoded.txn

  const sender = transactionSenderAddress(txn)
  if (!sameAddress(sender, address)) {
    res.status(401).json({ error: 'Signed transaction sender mismatch' })
    return
  }

  const note = txn.note ? new TextDecoder().decode(txn.note) : ''
  const expected = `zeril-auth:${nonce}`
  if (note !== expected) {
    res.status(401).json({ error: 'Invalid auth note' })
    return
  }

  const sig = decoded.sig != null ? new Uint8Array(decoded.sig) : null
  const publicKey = algosdk.decodeAddress(address).publicKey
  const toVerify = txn.bytesToSign()

  if (!sig?.length || !nacl.sign.detached.verify(toVerify, sig, publicKey)) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  const token = signToken({ sub: address, role })
  res.json({ token, address, role })
})

export default router
