import { motion } from 'framer-motion'
import SectionLabel from './SectionLabel'

const features = [
  { title: 'On-Chain Employee Registry', text: 'Tamper-proof, decentralized records of your entire team on the blockchain.' },
  { title: 'USDC Salary Distribution', text: 'Stable value, instant settlement. No exchange rate surprises.' },
  { title: 'Smart Contract Automation', text: 'The contract executes distributions. No manual intervention needed.' },
  { title: 'Multi-Wallet Support', text: 'Employees receive funds in any Algorand-compatible wallet.' },
  { title: 'Transparent & Auditable', text: 'Every payment is on-chain. Immutable records. Full audit trail.' },
  { title: 'Real-Time Dashboard', text: 'Track payroll history, balances, and employee status from one place.' },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto">
        <SectionLabel number="04" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-[3.5rem] tracking-tight font-light">
            <span className="block leading-none">Everything you need.</span>
            <span className="block font-serif italic leading-none mt-3 lg:mt-5">Nothing you don&apos;t.</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
            >
              <h4 className="text-[15px] font-semibold tracking-tight mb-2">{f.title}</h4>
              <p className="text-[14px] leading-relaxed" style={{ color: 'var(--l-muted)' }}>{f.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
