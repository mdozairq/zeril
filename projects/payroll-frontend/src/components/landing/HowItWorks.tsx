import { useState, useEffect, useRef } from 'react'
import { Rocket, UserPlus, Play, CheckCircle } from 'lucide-react'
import SectionLabel from './SectionLabel'

interface StepItem {
  id: number
  title: string
  description: string
  icon: React.ElementType
  status: 'completed' | 'in-progress' | 'pending'
  energy: number
}

const steps: StepItem[] = [
  {
    id: 1,
    title: 'Deploy Contract',
    description: 'Provision your payroll smart contract on Algorand. One command, minutes to live.',
    icon: Rocket,
    status: 'completed',
    energy: 100,
  },
  {
    id: 2,
    title: 'Register Team',
    description: 'Add employees with their Algorand wallet addresses and salary amounts in USDC.',
    icon: UserPlus,
    status: 'completed',
    energy: 80,
  },
  {
    id: 3,
    title: 'Run Payroll',
    description: 'Trigger a single transaction. The smart contract sends USDC directly to each employee.',
    icon: Play,
    status: 'in-progress',
    energy: 60,
  },
  {
    id: 4,
    title: 'Done',
    description: 'USDC lands in every wallet instantly. On-chain, verified, complete. Ready for next cycle.',
    icon: CheckCircle,
    status: 'pending',
    energy: 30,
  },
]

const ORBIT_RADIUS_LG = 180
const ORBIT_RADIUS_SM = 120

export default function HowItWorks() {
  const [rotationAngle, setRotationAngle] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [pulsingIds, setPulsingIds] = useState<Set<number>>(new Set())
  const [radius, setRadius] = useState(ORBIT_RADIUS_LG)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => setRadius(window.innerWidth < 640 ? ORBIT_RADIUS_SM : ORBIT_RADIUS_LG)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!autoRotate) return
    const timer = setInterval(() => {
      setRotationAngle((prev) => (prev + 0.3) % 360)
    }, 50)
    return () => clearInterval(timer)
  }, [autoRotate])

  const toggleItem = (id: number) => {
    if (activeId === id) {
      setActiveId(null)
      setAutoRotate(true)
      setPulsingIds(new Set())
    } else {
      setActiveId(id)
      setAutoRotate(false)
      const neighbors = new Set<number>()
      if (id > 1) neighbors.add(id - 1)
      if (id < steps.length) neighbors.add(id + 1)
      setPulsingIds(neighbors)
      const idx = steps.findIndex((s) => s.id === id)
      setRotationAngle(270 - (idx / steps.length) * 360)
    }
  }

  const handleBgClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).dataset.orbitBg !== undefined) {
      setActiveId(null)
      setAutoRotate(true)
      setPulsingIds(new Set())
    }
  }

  const getPosition = (index: number) => {
    const angle = ((index / steps.length) * 360 + rotationAngle) % 360
    const radian = (angle * Math.PI) / 180
    return {
      x: radius * Math.cos(radian),
      y: radius * Math.sin(radian),
      zIndex: Math.round(100 + 50 * Math.cos(radian)),
      opacity: Math.max(0.4, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2)),
    }
  }

  return (
    <section id="how-it-works" className="relative overflow-hidden" style={{ backgroundColor: '#050505' }}>
      <div className="px-6 pt-24 md:pt-32 pb-8">
        <div className="max-w-[1200px] mx-auto">
          <SectionLabel number="03" />
          <h2 className="text-3xl sm:text-4xl lg:text-[3.5rem] tracking-tight font-light mb-4" style={{ color: '#FAFAF7' }}>
            <span className="block leading-none">Deploy to payday</span>
            <span className="block font-serif italic leading-none mt-3 lg:mt-5">in four steps.</span>
          </h2>
          <p className="text-[15px] max-w-lg" style={{ color: 'rgba(250,250,247,0.4)' }}>
            Click any node to explore. The orbit pauses so you can read.
          </p>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full flex items-center justify-center cursor-default"
        style={{ height: '520px' }}
        onClick={handleBgClick}
      >
        {/* Grid bg */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#FAFAF7 1px, transparent 1px), linear-gradient(90deg, #FAFAF7 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(250,250,247,0.06) 0%, transparent 70%)' }}
        />

        {/* Orbit ring */}
        <div
          data-orbit-bg=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border pointer-events-none"
          style={{ width: `${radius * 2}px`, height: `${radius * 2}px`, borderColor: 'rgba(250,250,247,0.06)' }}
        />

        {/* Center node */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative">
            <div className="w-14 h-14 rounded-full flex items-center justify-center border" style={{ backgroundColor: '#FAFAF7', borderColor: 'rgba(250,250,247,0.2)' }}>
              <span className="font-serif italic text-[18px] font-bold tracking-tight" style={{ color: '#0A0A0A' }}>Z</span>
            </div>
            <div className="absolute inset-0 rounded-full animate-ping opacity-10" style={{ border: '1px solid #FAFAF7' }} />
            <div className="absolute -inset-2 rounded-full animate-ping opacity-5" style={{ border: '1px solid #FAFAF7', animationDelay: '0.5s' }} />
          </div>
        </div>

        {/* Nodes */}
        {steps.map((step, index) => {
          const pos = getPosition(index)
          const isActive = activeId === step.id
          const isPulsing = pulsingIds.has(step.id)
          const Icon = step.icon

          return (
            <div
              key={step.id}
              className="absolute top-1/2 left-1/2 transition-all duration-700 cursor-pointer"
              style={{
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                zIndex: isActive ? 200 : pos.zIndex,
                opacity: isActive ? 1 : pos.opacity,
              }}
              onClick={(e) => { e.stopPropagation(); toggleItem(step.id) }}
            >
              <div
                className={`absolute rounded-full ${isPulsing ? 'animate-pulse' : ''}`}
                style={{
                  width: `${step.energy * 0.4 + 40}px`,
                  height: `${step.energy * 0.4 + 40}px`,
                  left: `${-(step.energy * 0.4 + 40 - 40) / 2}px`,
                  top: `${-(step.energy * 0.4 + 40 - 40) / 2}px`,
                  background: 'radial-gradient(circle, rgba(250,250,247,0.06) 0%, transparent 70%)',
                }}
              />

              <div
                className={`relative w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'scale-[1.4]' : ''}`}
                style={{
                  backgroundColor: isActive ? '#FAFAF7' : isPulsing ? 'rgba(250,250,247,0.2)' : '#0A0A0A',
                  borderColor: isActive ? '#FAFAF7' : isPulsing ? '#FAFAF7' : 'rgba(250,250,247,0.25)',
                  boxShadow: isActive ? '0 0 24px rgba(250,250,247,0.2)' : 'none',
                  color: isActive ? '#0A0A0A' : '#FAFAF7',
                }}
              >
                <Icon size={16} />
              </div>

              <div
                className={`absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] font-medium tracking-wider transition-all duration-300 ${isActive ? 'scale-110' : ''}`}
                style={{ color: isActive ? '#FAFAF7' : 'rgba(250,250,247,0.5)' }}
              >
                {step.title}
              </div>

              {isActive && (
                <div
                  className="absolute top-20 left-1/2 -translate-x-1/2 w-64 backdrop-blur-xl overflow-visible"
                  style={{
                    backgroundColor: 'rgba(10,10,10,0.95)',
                    border: '1px solid rgba(250,250,247,0.12)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  }}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3" style={{ backgroundColor: 'rgba(250,250,247,0.2)' }} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5"
                        style={{
                          backgroundColor: step.status === 'completed' ? '#FAFAF7' : step.status === 'in-progress' ? 'rgba(250,250,247,0.1)' : 'rgba(250,250,247,0.05)',
                          color: step.status === 'completed' ? '#0A0A0A' : '#FAFAF7',
                        }}
                      >
                        {step.status === 'completed' ? 'COMPLETE' : step.status === 'in-progress' ? 'IN PROGRESS' : 'PENDING'}
                      </span>
                      <span className="font-mono text-[11px]" style={{ color: 'rgba(250,250,247,0.3)' }}>0{step.id}/04</span>
                    </div>
                    <h4 className="text-[14px] font-semibold mb-2" style={{ color: '#FAFAF7' }}>{step.title}</h4>
                    <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(250,250,247,0.6)' }}>{step.description}</p>
                    <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(250,250,247,0.06)' }}>
                      <div className="flex justify-between items-center text-[10px] mb-1.5">
                        <span style={{ color: 'rgba(250,250,247,0.4)' }}>Progress</span>
                        <span className="font-mono" style={{ color: 'rgba(250,250,247,0.4)' }}>{step.energy}%</span>
                      </div>
                      <div className="w-full h-1 overflow-hidden" style={{ backgroundColor: 'rgba(250,250,247,0.06)' }}>
                        <div className="h-full transition-all duration-500" style={{ width: `${step.energy}%`, backgroundColor: '#FAFAF7' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
