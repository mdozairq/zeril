import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import MagneticButton from './MagneticButton'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const STYLES = `
.cinematic-footer-wrapper {
  font-family: 'Outfit', sans-serif;
  -webkit-font-smoothing: antialiased;

  --foreground: #FAFAF7;
  --background: #0A0A0A;
  --primary: #FAFAF7;
  --secondary: #1A1A1A;
  --border: #222;
  --muted-foreground: #6B7280;

  --pill-bg-1: rgba(250,250,247,0.03);
  --pill-bg-2: rgba(250,250,247,0.01);
  --pill-shadow: rgba(10,10,10,0.5);
  --pill-highlight: rgba(250,250,247,0.08);
  --pill-inset-shadow: rgba(10,10,10,0.8);
  --pill-border: rgba(250,250,247,0.08);

  --pill-bg-1-hover: rgba(250,250,247,0.08);
  --pill-bg-2-hover: rgba(250,250,247,0.02);
  --pill-border-hover: rgba(250,250,247,0.2);
  --pill-shadow-hover: rgba(10,10,10,0.7);
  --pill-highlight-hover: rgba(250,250,247,0.15);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); }
  15%, 45% { transform: scale(1.2); }
  30% { transform: scale(1); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 40s linear infinite;
}

.animate-footer-heartbeat {
  animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
}

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, rgba(250,250,247,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(250,250,247,0.03) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%,
    rgba(250,250,247,0.04) 0%,
    rgba(250,250,247,0.015) 40%,
    transparent 70%
  );
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow:
    0 10px 30px -10px var(--pill-shadow),
    inset 0 1px 1px var(--pill-highlight),
    inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow:
    0 20px 40px -10px var(--pill-shadow-hover),
    inset 0 1px 1px var(--pill-highlight-hover);
  color: var(--foreground);
}

.footer-giant-bg-text {
  font-size: 22vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(250,250,247,0.04);
  background: linear-gradient(180deg, rgba(250,250,247,0.06) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  background: linear-gradient(180deg, #FAFAF7 0%, rgba(250,250,247,0.4) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 20px rgba(250,250,247,0.1));
}
`

const MarqueeItem = () => (
  <div className="flex items-center space-x-12 px-6">
    <span>On-Chain Payroll</span> <span style={{ color: 'rgba(250,250,247,0.15)' }}>&#10022;</span>
    <span>USDC Payments</span> <span style={{ color: 'rgba(250,250,247,0.08)' }}>&#10022;</span>
    <span>Smart Contracts</span> <span style={{ color: 'rgba(250,250,247,0.15)' }}>&#10022;</span>
    <span>Instant Settlement</span> <span style={{ color: 'rgba(250,250,247,0.08)' }}>&#10022;</span>
    <span>Open Source</span> <span style={{ color: 'rgba(250,250,247,0.15)' }}>&#10022;</span>
  </div>
)

export default function CinematicFooter({ onLaunchApp }: { onLaunchApp: () => void }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const giantTextRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const linksRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !wrapperRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { y: '10vh', scale: 0.8, opacity: 0 },
        {
          y: '0vh', scale: 1, opacity: 1, ease: 'power1.out',
          scrollTrigger: { trigger: wrapperRef.current, start: 'top 80%', end: 'bottom bottom', scrub: 1 },
        },
      )

      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, stagger: 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: wrapperRef.current, start: 'top 40%', end: 'bottom bottom', scrub: 1 },
        },
      )
    }, wrapperRef)

    return () => ctx.revert()
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div
        ref={wrapperRef}
        className="relative h-screen w-full"
        style={{ clipPath: 'polygon(0% 0, 100% 0%, 100% 100%, 0 100%)' }}
      >
        <footer className="fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden cinematic-footer-wrapper"
          style={{ backgroundColor: '#0A0A0A', color: '#FAFAF7' }}
        >
          {/* Ambient glow + grid */}
          <div className="footer-aurora absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px] pointer-events-none z-0" />
          <div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />

          {/* Giant background text */}
          <div
            ref={giantTextRef}
            className="footer-giant-bg-text absolute -bottom-[5vh] left-1/2 -translate-x-1/2 whitespace-nowrap z-0 pointer-events-none select-none"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            ZERIL
          </div>

          {/* Diagonal marquee */}
          <div
            className="absolute top-12 left-0 w-full overflow-hidden py-4 z-10 -rotate-2 scale-110"
            style={{
              borderTop: '1px solid rgba(250,250,247,0.06)',
              borderBottom: '1px solid rgba(250,250,247,0.06)',
              backgroundColor: 'rgba(10,10,10,0.6)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex w-max animate-footer-scroll-marquee text-xs md:text-sm font-bold tracking-[0.3em] uppercase" style={{ color: 'rgba(250,250,247,0.25)' }}>
              <MarqueeItem />
              <MarqueeItem />
            </div>
          </div>

          {/* Center content */}
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 mt-20 w-full max-w-4xl mx-auto">
            <h2
              ref={headingRef}
              className="text-4xl md:text-7xl lg:text-8xl font-black footer-text-glow tracking-tighter mb-12 text-center"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Ready to begin?
            </h2>

            <div ref={linksRef} className="flex flex-col items-center gap-6 w-full">
              {/* Primary CTAs */}
              <div className="flex flex-wrap justify-center gap-4 w-full">
                <MagneticButton
                  as="button"
                  onClick={onLaunchApp}
                  className="footer-glass-pill px-10 py-5 rounded-full font-bold text-sm md:text-base flex items-center gap-3"
                  style={{ color: '#FAFAF7' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 8.5l5 3.5-5 3.5V8.5z" />
                  </svg>
                  Launch App
                </MagneticButton>

                <MagneticButton
                  as="a"
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-glass-pill px-10 py-5 rounded-full font-bold text-sm md:text-base flex items-center gap-3"
                  style={{ color: '#FAFAF7' }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" style={{ color: '#6B7280' }}>
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  View on GitHub
                </MagneticButton>
              </div>

              {/* Secondary links */}
              <div className="flex flex-wrap justify-center gap-3 md:gap-5 w-full mt-2">
                <MagneticButton as="a" href="#" className="footer-glass-pill px-6 py-3 rounded-full font-medium text-xs md:text-sm" style={{ color: '#6B7280' }}>
                  Documentation
                </MagneticButton>
                <MagneticButton as="a" href="https://algorand.co" target="_blank" rel="noopener noreferrer" className="footer-glass-pill px-6 py-3 rounded-full font-medium text-xs md:text-sm" style={{ color: '#6B7280' }}>
                  Algorand
                </MagneticButton>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="relative z-20 w-full pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-[10px] md:text-xs font-semibold tracking-widest uppercase order-2 md:order-1" style={{ color: '#6B7280' }}>
              &copy; {new Date().getFullYear()} Zeril. All rights reserved.
            </div>

            <div className="footer-glass-pill px-6 py-3 rounded-full flex items-center gap-2 order-1 md:order-2 cursor-default">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>Built on</span>
              <span className="font-black text-xs md:text-sm ml-1" style={{ color: '#FAFAF7' }}>Algorand</span>
            </div>

            <MagneticButton
              as="button"
              onClick={scrollToTop}
              className="w-12 h-12 rounded-full footer-glass-pill flex items-center justify-center group order-3"
              style={{ color: '#6B7280' }}
            >
              <svg className="w-5 h-5 transform group-hover:-translate-y-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  )
}
