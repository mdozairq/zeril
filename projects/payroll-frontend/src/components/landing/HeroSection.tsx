import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import BackgroundPaths from './BackgroundPaths'
import MagneticButton from './MagneticButton'

export default function HeroSection({ onLaunchApp }: { onLaunchApp: () => void }) {
  const scrollToHow = () => {
    const el = document.querySelector('#how-it-works')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-16 px-6 overflow-hidden">
      <BackgroundPaths />

      <div className="relative z-10 max-w-[1200px] mx-auto w-full py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="text-[clamp(3rem,8vw,7rem)] tracking-tight font-light mb-8">
            <span className="block leading-none">Payroll infra that</span>
            <span className="block font-serif italic leading-none mt-3 lg:mt-5">runs itself.</span>
          </h1>

          <p
            className="text-lg sm:text-xl leading-relaxed max-w-xl mb-12"
            style={{ color: 'var(--l-muted)' }}
          >
            Deploy a smart contract. Register your team. Distribute USDC salaries.
            <br className="hidden sm:block" />
            Zeril is payroll infrastructure for on-chain teams.
          </p>

          <div className="flex flex-wrap items-center gap-4 mb-20">
            <MagneticButton
              as="button"
              onClick={onLaunchApp}
              className="glass-pill rounded-full text-[14px] font-semibold px-8 py-4 flex items-center gap-3"
              style={{ color: 'var(--l-fg)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 8.5l5 3.5-5 3.5V8.5z" />
              </svg>
              Launch App
            </MagneticButton>
            <MagneticButton
              as="button"
              onClick={scrollToHow}
              strength={0.2}
              className="glass-pill rounded-full text-[14px] font-medium px-8 py-4 group flex items-center gap-2"
              style={{ color: 'var(--l-muted)' }}
            >
              See how it works
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="h-px w-full mb-8" style={{ backgroundColor: 'var(--l-border)' }} />
          <div className="flex flex-wrap items-baseline gap-x-12 gap-y-6">
            <div>
              <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight">USDC</span>
              <span className="text-sm ml-3" style={{ color: 'var(--l-muted)' }}>stablecoin salaries</span>
            </div>
            <div>
              <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight">1-Click</span>
              <span className="text-sm ml-3" style={{ color: 'var(--l-muted)' }}>payroll runs</span>
            </div>
            <div>
              <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight">Open</span>
              <span className="text-sm ml-3" style={{ color: 'var(--l-muted)' }}>source & self-hosted</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
