import { Router } from 'express'
import { calculateTax, getSupportedCountries, getCountryConfig } from '../lib/tax.js'

const router = Router()

router.post('/tax/calculate', (req, res) => {
  const { amountUsd, countryCode, annualIncome, employmentType } = req.body as {
    amountUsd?: number
    countryCode?: string
    annualIncome?: number
    employmentType?: string
  }

  if (amountUsd === undefined || amountUsd < 0) {
    res.status(400).json({ error: 'amountUsd is required and must be >= 0' })
    return
  }

  const breakdown = calculateTax(amountUsd, countryCode, annualIncome, employmentType)
  res.json(breakdown)
})

router.get('/countries', (_req, res) => {
  res.json(getSupportedCountries())
})

router.get('/countries/:code', (req, res) => {
  const cfg = getCountryConfig(req.params.code)
  res.json({
    code: cfg.code,
    name: cfg.name,
    currency: cfg.currency,
    requiredKycDocs: cfg.requiredKycDocs,
    bankFields: cfg.bankFields,
  })
})

router.get('/countries/:code/bank-fields', (req, res) => {
  const cfg = getCountryConfig(req.params.code)
  res.json(cfg.bankFields)
})

router.get('/countries/:code/kyc-docs', (req, res) => {
  const cfg = getCountryConfig(req.params.code)
  res.json(cfg.requiredKycDocs)
})

export default router
