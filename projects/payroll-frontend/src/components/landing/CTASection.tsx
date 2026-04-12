import { motion } from 'framer-motion'
import MagneticButton from './MagneticButton'

export default function CTASection({ onLaunchApp }: { onLaunchApp: () => void }) {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto">
        <div className="h-px w-full mb-20" style={{ backgroundColor: 'var(--l-border)' }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-[3.5rem] tracking-tight font-light mb-10">
            <span className="block leading-none">Ready to deploy payroll</span>
            <span className="block font-serif italic leading-none mt-3 lg:mt-5">on-chain?</span>
          </h2>

          <MagneticButton
            as="button"
            onClick={onLaunchApp}
            className="glass-pill rounded-full text-[15px] font-semibold px-10 py-4 mb-8 inline-flex items-center gap-3"
            style={{ color: 'var(--l-fg)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 8.5l5 3.5-5 3.5V8.5z" />
            </svg>
            Launch App
          </MagneticButton>

          <p className="text-[13px]" style={{ color: 'var(--l-muted)' }}>
            Free to deploy&ensp;&middot;&ensp;Open source&ensp;&middot;&ensp;No vendor lock-in
          </p>
        </motion.div>
      </div>
    </section>
  )
}
