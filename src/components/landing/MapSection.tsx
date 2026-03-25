'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import type { ReactNode } from 'react'

interface MapSectionProps {
  /** X position on map (px) */
  x: number
  /** Y position on map (px) */
  y: number
  /** Content width (px in map coords) */
  width?: number
  /** Content */
  children: ReactNode
  /** CSS class */
  className?: string
  /** Animation direction */
  animateFrom?: 'left' | 'right' | 'bottom' | 'top'
  /** Animation delay */
  delay?: number
  /** Show immediately on mount (skip inView check) — use for hero/first section */
  immediate?: boolean
}

export function MapSection({
  x,
  y,
  width = 500,
  children,
  className = '',
  animateFrom = 'bottom',
  delay = 0,
  immediate = false,
}: MapSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, amount: 0.3 })

  const directionOffset = {
    left: { x: -60, y: 0 },
    right: { x: 60, y: 0 },
    bottom: { x: 0, y: 40 },
    top: { x: 0, y: -40 },
  }

  const offset = directionOffset[animateFrom]
  const show = immediate || isInView

  return (
    <motion.div
      ref={ref}
      className={`absolute pointer-events-auto ${className}`}
      style={{
        left: x - width / 2,
        top: y - 300,
        width,
      }}
      initial={immediate ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: offset.x, y: offset.y }}
      animate={show ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: offset.x, y: offset.y }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
