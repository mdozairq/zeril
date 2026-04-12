import { motion } from 'framer-motion'
import SectionLabel from './SectionLabel'

const problems = [
  {
    id: '01',
    title: 'Delays',
    text: 'Banks take days to process payroll. Cross-border payments? Weeks. Your team deserves better than waiting.',
  },
  {
    id: '02',
    title: 'Opacity',
    text: "Employees can't verify payments. Employers reconcile spreadsheets endlessly. Nobody has a clear picture.",
  },
  {
    id: '03',
    title: 'Friction',
    text: 'Exchange rates, SWIFT fees, compliance paperwork in every country. Paying a global team is a full-time job.',
  },
  {
    id: '04',
    title: 'Complexity',
    text: 'Existing crypto solutions force users through seed phrases and confusing interfaces. Not built for real teams.',
  },
]

export default function ProblemSection() {
  return (
    <section id="problem" className="px-6 py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto">
        <SectionLabel number="01" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-[3.5rem] tracking-tight font-light mb-16">
            <span className="block leading-none">Payroll infrastructure</span>
            <span className="block font-serif italic leading-none mt-3 lg:mt-5">is stuck in the past.</span>
          </h2>
        </motion.div>

        <div className="space-y-0">
          {problems.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="border-t py-6 md:py-8 grid grid-cols-1 md:grid-cols-[80px_200px_1fr] gap-2 md:gap-8 items-baseline"
              style={{ borderColor: 'var(--l-border)' }}
            >
              <span className="font-mono text-[13px]" style={{ color: 'var(--l-muted)' }}>
                {p.id}
              </span>
              <span className="text-[15px] font-semibold tracking-tight">{p.title}</span>
              <span className="text-[15px] leading-relaxed" style={{ color: 'var(--l-muted)' }}>
                {p.text}
              </span>
            </motion.div>
          ))}
          <div className="border-t" style={{ borderColor: 'var(--l-border)' }} />
        </div>
      </div>
    </section>
  )
}
