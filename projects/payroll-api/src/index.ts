import express from 'express'
import cors from 'cors'
import companiesRouter from './routes/companies.js'
import auditRouter from './routes/audit.js'
import payrollRunsRouter from './routes/payrollRuns.js'
import { prisma } from './db.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/companies', companiesRouter)
app.use('/api/audit', auditRouter)
app.use('/api/payroll-runs', payrollRunsRouter)

app.listen(PORT, () => {
  console.log(`Payroll API running on http://localhost:${PORT}`)
})

process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
