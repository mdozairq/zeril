import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MagneticButton from './MagneticButton'

const navLinks = [
  { label: 'Problem', href: '#problem' },
  { label: 'Solution', href: '#solution' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Developers', href: '#developers' },
]

export default function Navbar({ onLaunchApp }: { onLaunchApp: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        backgroundColor: 'rgba(10, 10, 10, 0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderColor: 'var(--l-border)',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo — stacked typographic treatment */}
        <a href="#" className="flex flex-col items-start leading-none select-none">
          <span
            className="font-serif italic text-[26px] leading-none tracking-tight"
            style={{ color: 'var(--l-fg)' }}
          >
            Z
          </span>
          <span
            className="font-mono text-[7px] font-medium tracking-[0.3em] uppercase leading-none -mt-0.5"
            style={{ color: 'var(--l-muted)' }}
          >
            eril
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-[12px] font-medium tracking-[0.15em] uppercase transition-colors duration-300"
              style={{ color: 'var(--l-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--l-fg)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--l-muted)')}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <MagneticButton
          as="button"
          onClick={onLaunchApp}
          strength={0.25}
          className="hidden md:flex items-center gap-2 glass-pill rounded-full text-[12px] font-semibold tracking-wide px-6 py-2.5"
          style={{ color: 'var(--l-fg)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Launch App
        </MagneticButton>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: 'var(--l-fg)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {mobileOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 8h16M4 16h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t overflow-hidden"
            style={{ backgroundColor: 'var(--l-bg)', borderColor: 'var(--l-border)' }}
          >
            <div className="px-6 py-5 flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-[13px] font-medium py-2.5 text-left tracking-[0.15em] uppercase"
                  style={{ color: 'var(--l-muted)' }}
                >
                  {link.label}
                </button>
              ))}
              <button
                onClick={() => { setMobileOpen(false); onLaunchApp() }}
                className="glass-pill rounded-full text-[12px] font-semibold px-6 py-3 mt-3 flex items-center justify-center gap-2"
                style={{ color: 'var(--l-fg)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Launch App
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
