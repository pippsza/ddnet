'use client'

import { type ReactNode, useEffect, useRef, forwardRef } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useInView,
  type Variants,
  type HTMLMotionProps,
} from 'framer-motion'
import { cn } from '@/lib/utils'

/* ─── Page Transition ─── */

export const PageTransition = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  ),
)
PageTransition.displayName = 'PageTransition'

/* ─── Stagger Container + Item ─── */

const staggerContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export const StaggerContainer = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  ({ children, className, ...props }, ref) => (
    <motion.div
      ref={ref}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  ),
)
StaggerContainer.displayName = 'StaggerContainer'

export const StaggerItem = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  ({ children, className, ...props }, ref) => (
    <motion.div ref={ref} variants={staggerItemVariants} className={cn(className)} {...props}>
      {children}
    </motion.div>
  ),
)
StaggerItem.displayName = 'StaggerItem'

/* ─── Fade In ─── */

const directionOffset = {
  up: { y: 20 },
  down: { y: -20 },
  left: { x: 20 },
  right: { x: -20 },
} as const

interface FadeInProps extends HTMLMotionProps<'div'> {
  direction?: keyof typeof directionOffset
  delay?: number
  duration?: number
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, className, direction = 'up', delay = 0, duration = 0.4, ...props }, ref) => {
    const offset = directionOffset[direction]

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, ...offset }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
FadeIn.displayName = 'FadeIn'

/* ─── Animated Counter ─── */

interface AnimatedCounterProps extends HTMLMotionProps<'span'> {
  value: number
  duration?: number
  formatFn?: (n: number) => string
}

export function AnimatedCounter({
  value,
  className,
  duration = 1.2,
  formatFn,
  ...props
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionVal = useMotionValue(0)

  const rounded = useTransform(motionVal, (v) => {
    const n = Math.round(v)
    return formatFn ? formatFn(n) : n.toLocaleString()
  })

  const isInView = useInView(ref, { once: true, margin: '-40px' })

  useEffect(() => {
    if (!isInView) return
    const controls = animate(motionVal, value, {
      duration,
      ease: [0.25, 0.46, 0.45, 0.94],
    })
    return controls.stop
  }, [isInView, value, duration, motionVal])

  return (
    <motion.span ref={ref} className={cn(className)} {...props}>
      {rounded}
    </motion.span>
  )
}

/* ─── Scale In ─── */

export const ScaleIn = forwardRef<HTMLDivElement, HTMLMotionProps<'div'>>(
  ({ children, className, transition, ...props }, ref) => (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
        ...transition,
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  ),
)
ScaleIn.displayName = 'ScaleIn'
