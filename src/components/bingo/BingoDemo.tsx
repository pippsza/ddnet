'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

const GRID_SIZE = 5
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE

const PLACEHOLDER_MAPS = [
  'Kobra 4', 'Sunny Side', 'Multeasymap', 'Back in Time 2', 'Sunset',
  'Stronghold', 'Crimson', 'Fly 4', 'Narcis', 'Chill 1',
  'Lost Way', 'Binary', 'FlipFlop', 'Ember 3', 'Just2Easy',
  'Cavern', 'Stardust', 'Bosporus 2', 'Aqua 3', 'Thunder',
  'Crystal', 'Duskwood', 'NUT', 'Delta 3', 'Zenith',
]

// Animation script: scatter cells first, then complete the diagonal
const SCATTER_CELLS = [3, 17, 21, 8]
const WINNING_DIAGONAL = [0, 6, 12, 18, 24]
const FULL_SEQUENCE = [...SCATTER_CELLS, ...WINNING_DIAGONAL]

const CELL_DELAY = 600
const CELEBRATE_DURATION = 3000
const RESET_DURATION = 1000

type Phase = 'playing' | 'celebrating' | 'resetting'

export function BingoDemo({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { amount: 0.3 })
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [phase, setPhase] = useState<Phase>('playing')
  const [stepIndex, setStepIndex] = useState(0)
  const [latestCell, setLatestCell] = useState<number | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const confettiFiredRef = useRef(false)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    setCompleted(new Set())
    setPhase('playing')
    setStepIndex(0)
    setLatestCell(null)
    confettiFiredRef.current = false
  }, [clearTimers])

  // Main animation loop
  useEffect(() => {
    if (!isInView) return
    if (phase !== 'playing') return
    if (stepIndex >= FULL_SEQUENCE.length) return

    const timer = setTimeout(() => {
      const cellIdx = FULL_SEQUENCE[stepIndex]
      setLatestCell(cellIdx)
      setCompleted((prev) => new Set([...prev, cellIdx]))

      // Check if diagonal is complete
      if (stepIndex === FULL_SEQUENCE.length - 1) {
        setPhase('celebrating')
      } else {
        setStepIndex((i) => i + 1)
      }
    }, stepIndex === 0 ? 800 : CELL_DELAY)

    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [isInView, phase, stepIndex])

  // Celebration phase: fire confetti then reset
  useEffect(() => {
    if (phase !== 'celebrating') return
    if (confettiFiredRef.current) return
    confettiFiredRef.current = true

    import('canvas-confetti').then((mod) => {
      const confetti = mod.default
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
      setTimeout(() => confetti({ particleCount: 60, spread: 90, origin: { y: 0.5, x: 0.3 } }), 300)
      setTimeout(() => confetti({ particleCount: 60, spread: 90, origin: { y: 0.5, x: 0.7 } }), 600)
    })

    const timer = setTimeout(() => {
      setPhase('resetting')
    }, CELEBRATE_DURATION)
    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [phase])

  // Reset phase: brief pause then restart
  useEffect(() => {
    if (phase !== 'resetting') return

    const timer = setTimeout(reset, RESET_DURATION)
    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [phase, reset])

  // Pause when out of view
  useEffect(() => {
    if (!isInView) {
      clearTimers()
    }
  }, [isInView, clearTimers])

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers])

  const winSet = new Set(WINNING_DIAGONAL)
  const allWinningDone = phase === 'celebrating' || phase === 'resetting'

  return (
    <div ref={containerRef} className={cn('select-none w-full max-w-sm mx-auto', className)}>
      <div
        className="grid gap-1 sm:gap-1.5 md:gap-2 mx-auto"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
      >
        {Array.from({ length: TOTAL_CELLS }).map((_, i) => {
          const isDone = completed.has(i)
          const isWinCell = winSet.has(i)
          const isNew = latestCell === i && isDone
          const isWinning = allWinningDone && isWinCell && isDone

          return (
            <motion.div
              key={i}
              className={cn(
                'aspect-square rounded-md sm:rounded-lg md:rounded-xl border sm:border-2 flex items-center justify-center text-[8px] sm:text-[10px] md:text-xs font-mono transition-colors overflow-hidden',
                isDone
                  ? 'bg-primary/20 border-primary'
                  : 'bg-card/80 border-border',
              )}
              animate={
                isWinning
                  ? { opacity: [0.7, 1, 0.7] }
                  : isNew
                    ? { scale: [1, 1.15, 1], boxShadow: ['0 0 0px transparent', '0 0 16px color-mix(in srgb, var(--primary) 40%, transparent)', '0 0 0px transparent'] }
                    : {}
              }
              transition={
                isWinning
                  ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                  : isNew
                    ? { duration: 0.4, ease: 'easeOut' }
                    : {}
              }
            >
              {isDone ? (
                <Trophy className="size-3 sm:size-4 text-primary" />
              ) : (
                <span className="text-muted-foreground truncate px-0.5">
                  {PLACEHOLDER_MAPS[i]?.split(' ')[0]}
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
