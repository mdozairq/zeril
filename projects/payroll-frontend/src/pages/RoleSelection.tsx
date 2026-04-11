import { motion } from 'framer-motion'
import { Building2, User } from 'lucide-react'

interface RoleSelectionProps {
  onSelectRole: (role: 'company' | 'employee') => void
  onBack: () => void
  selectedRole?: 'company' | 'employee' | null
}

export default function RoleSelection({ onSelectRole, onBack, selectedRole }: RoleSelectionProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}>
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16 flex flex-col items-center"
      >
        <span className="font-serif italic text-[64px] leading-none tracking-tight">Z</span>
        <span className="font-mono text-[11px] font-medium tracking-[0.4em] uppercase -mt-1" style={{ color: 'rgba(250,250,247,0.5)' }}>eril</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-2xl sm:text-3xl font-light tracking-tight mb-3 text-center"
      >
        How would you like to use Zeril?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-[14px] mb-12 text-center"
        style={{ color: 'rgba(250,250,247,0.45)' }}
      >
        {selectedRole
          ? 'Connect your wallet to continue'
          : 'Choose your role to get started'}
      </motion.p>

      <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {(['company', 'employee'] as const).map((r, i) => {
          const isCompany = r === 'company'
          const isSelected = selectedRole === r
          return (
            <motion.button
              key={r}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              onClick={() => onSelectRole(r)}
              className="group relative p-8 rounded-2xl text-left transition-all duration-300 cursor-pointer"
              style={{
                backgroundColor: isSelected ? 'rgba(250,250,247,0.08)' : 'rgba(250,250,247,0.03)',
                border: isSelected ? '1px solid rgba(250,250,247,0.25)' : '1px solid rgba(250,250,247,0.08)',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(250,250,247,0.06)'
                  e.currentTarget.style.borderColor = 'rgba(250,250,247,0.2)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(250,250,247,0.03)'
                  e.currentTarget.style.borderColor = 'rgba(250,250,247,0.08)'
                }
              }}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(250,250,247,0.06)' }}>
                {isCompany
                  ? <Building2 size={22} style={{ color: 'rgba(250,250,247,0.7)' }} />
                  : <User size={22} style={{ color: 'rgba(250,250,247,0.7)' }} />
                }
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {isCompany ? 'Setup Payroll' : 'View Earnings'}
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(250,250,247,0.45)' }}>
                {isCompany
                  ? 'Deploy a contract, add your team, and run payroll. For employers and admins.'
                  : 'Check your salary, configure token allocation, and view payment history.'}
              </p>
              <div className="mt-4 font-mono text-[11px] tracking-wider uppercase" style={{ color: isSelected ? 'rgba(250,250,247,0.6)' : 'rgba(250,250,247,0.3)' }}>
                {isSelected ? 'Selected — connect wallet' : (isCompany ? 'Company' : 'Employee') + ' →'}
              </div>
            </motion.button>
          )
        })}
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={onBack}
        className="mt-8 text-[13px] font-medium transition-opacity hover:opacity-60"
        style={{ color: 'rgba(250,250,247,0.4)' }}
      >
        &larr; Back to home
      </motion.button>
    </div>
  )
}
