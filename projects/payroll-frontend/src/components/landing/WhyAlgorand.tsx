import { motion } from 'framer-motion'
import SectionLabel from './SectionLabel'

const stats = [
  { value: '~4s', label: 'Finality', note: 'Transactions settle before your coffee cools.' },
  { value: '$0.001', label: 'Per Transaction', note: 'Pay thousands for pennies. No gas wars.' },
  { value: '2019', label: 'Running Since', note: 'Zero forks. Zero downtime. Battle-tested.' },
  { value: 'Carbon−', label: 'Negative', note: 'One of the greenest chains in existence.' },
]

export default function WhyAlgorand() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto">
        <SectionLabel number="06" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-[3.5rem] tracking-tight font-light">
            <span className="block leading-none">Built on infrastructure</span>
            <span className="block font-serif italic leading-none mt-3 lg:mt-5">that delivers.</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="border-l py-6 px-6 first:border-l-0 sm:[&:nth-child(odd)]:border-l-0 lg:[&:nth-child(odd)]:border-l lg:first:border-l-0"
              style={{ borderColor: 'var(--l-border)' }}
            >
              <div className="font-mono text-3xl sm:text-4xl font-medium tracking-tight mb-1">{s.value}</div>
              <div className="text-[13px] font-semibold tracking-wide uppercase mb-3">{s.label}</div>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--l-muted)' }}>{s.note}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
