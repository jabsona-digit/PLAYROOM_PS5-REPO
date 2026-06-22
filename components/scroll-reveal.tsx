'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  animation?: 'float' | 'fade'
  delayMs?: number
  /** By setting this to true, the element renders normally without observation / hidden phases. Ideal for LCP items. */
  disabled?: boolean
}

/**
 * ScrollReveal Hook Component for Progressive Enhancement
 * 
 * Rule 1: Content is visible on server / for crawler.
 * When JS is active, it adds `will-reveal` (opacity 0) on mount.
 * When observer triggers, it adds `is-revealed` (CSS keyframes).
 */
export function ScrollReveal({
  children,
  animation = 'float',
  delayMs = 0,
  disabled = false,
  className,
  ...props
}: ScrollRevealProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (disabled) return
    setIsMounted(true)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Delay capability for staggered animations
          setTimeout(() => {
            setIsVisible(true)
          }, delayMs)
          
          if (ref.current) {
            observer.unobserve(ref.current)
          }
        }
      },
      { rootMargin: '0px 0px -20px 0px', threshold: 0.05 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [delayMs, disabled])

  if (disabled) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    )
  }

  // Progressive enhancement classes are driven by state
  // isMounted=false (Server) -> no classes, normal layout.
  return (
    <div
      ref={ref}
      className={cn(
        isMounted && !isVisible && 'will-reveal', // js mounted, observe phase
        isVisible && (animation === 'float' ? 'is-revealed' : 'is-revealed-fade'), // intersected phase
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
