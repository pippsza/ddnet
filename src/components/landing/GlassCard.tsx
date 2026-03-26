'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: ReactNode
  className?: string
  accent?: string // color for border glow
  /** Enable hover lift effect (scale + translate up) */
  hover?: boolean
}

export function GlassCard({ children, className, accent, hover }: GlassCardProps) {
  const style = accent ? { boxShadow: `0 0 40px ${accent}15, inset 0 1px 0 ${accent}20` } : undefined

  if (hover) {
    return (
      <motion.div
        className={cn(
          'rounded-2xl p-6 shadow-2xl landing-shell',
          className,
        )}
        style={style}
        whileHover={{ scale: 1.02, y: -3 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl p-6 shadow-2xl landing-shell',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  )
}
