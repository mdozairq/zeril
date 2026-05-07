import express from 'express'
import cors from 'cors'
import companiesRouter from './routes/companies.js'
import auditRouter from './routes/audit.js'
import payrollRunsRouter from './routes/payrollRuns.js'
import kycRouter from './routes/kyc.js'
import complianceDocsRouter from './routes/complianceDocuments.js'
import invitationsRouter from './routes/invitations.js'
import payoutPreferenceRouter from './routes/payoutPreference.js'
import offrampRouter from './routes/offramp.js'
import custodyRouter from './routes/custody.js'
import reportsRouter from './routes/reports.js'
import leaveRouter from './routes/leave.js'
import authRouter from './routes/auth.js'
import taxRouter from './routes/tax.js'
import { authOptional } from './middleware/auth.js'
import { prisma } from './db.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json())
app.use(authOptional)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/companies', companiesRouter)
app.use('/api/audit', auditRouter)
app.use('/api/payroll-runs', payrollRunsRouter)
app.use('/api', kycRouter)
app.use('/api/compliance-documents', complianceDocsRouter)
app.use('/api', invitationsRouter)
app.use('/api', payoutPreferenceRouter)
app.use('/api', offrampRouter)
app.use('/api', custodyRouter)
app.use('/api', reportsRouter)
app.use('/api', leaveRouter)
app.use('/api', authRouter)
app.use('/api', taxRouter)

app.listen(PORT, () => {
  console.log(`Payroll API running on http://localhost:${PORT}`)
})

process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
