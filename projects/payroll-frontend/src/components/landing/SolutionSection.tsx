import { motion } from 'framer-motion'
import SectionLabel from './SectionLabel'

const highlights = [
  { title: 'USDC Payments', text: 'Stable value, instant settlement, no conversion headaches.' },
  { title: 'On-Chain Transparency', text: 'Every payment verifiable. Full audit trail, zero trust required.' },
  { title: 'Employer Control', text: 'Only your wallet has admin access. You own the contract.' },
  { title: 'Fast & Cheap', text: '~4 second finality, near-zero fees. Payroll in seconds, not days.' },
]

export default function SolutionSection() {
  return (
    <section id="solution" className="px-6 py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto">
        <SectionLabel number="02" />

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-[3.5rem] tracking-tight font-light mb-8">
              <span className="block leading-none">Smart contracts</span>
              <span className="block font-serif italic leading-none mt-3 lg:mt-5">handle everything.</span>
            </h2>
            <p className="text-[15px] sm:text-base leading-relaxed" style={{ color: 'var(--l-muted)' }}>
              Zeril runs on Algorand. Deploy a contract, register employees
              with their wallets and salaries, and the contract distributes USDC.
              No intermediaries. Every payment auditable. Every record immutable.
            </p>
          </motion.div>

          <div className="space-y-8">
            {highlights.map((h, i) => (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <h4 className="text-[14px] font-semibold tracking-tight mb-1">{h.title}</h4>
                <p className="text-[14px] leading-relaxed" style={{ color: 'var(--l-muted)' }}>
                  {h.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
