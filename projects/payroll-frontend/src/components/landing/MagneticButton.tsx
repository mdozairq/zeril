import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { cn } from '../../lib/utils'

type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: React.ElementType
    strength?: number
  }

export default function MagneticButton({
  className,
  children,
  as: Component = 'button',
  strength = 0.35,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const el = ref.current
    if (!el) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      gsap.to(el, {
        x: x * strength,
        y: y * strength,
        scale: 1.04,
        ease: 'power2.out',
        duration: 0.4,
      })
    }

    const handleMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        scale: 1,
        ease: 'elastic.out(1, 0.3)',
        duration: 1,
      })
    }

    el.addEventListener('mousemove', handleMouseMove as any)
    el.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      el.removeEventListener('mousemove', handleMouseMove as any)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [strength])

  return (
    <Component ref={ref} className={cn('cursor-pointer', className)} {...props}>
      {children}
    </Component>
  )
}
