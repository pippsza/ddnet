'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface GameStartCountdownProps {
  maps: { mapName: string; position: number }[]
  gridSize: number
  onComplete: () => void
}

export function GameStartCountdown({ maps, gridSize, onComplete }: GameStartCountdownProps) {
  const [phase, setPhase] = useState<'reveal' | 'countdown' | 'done'>('reveal')
  const [countdownNum, setCountdownNum] = useState(3)
  const totalCells = gridSize * gridSize

  // Stagger delay per cell for reveal
  const cellDelay = Math.min(100, 2500 / totalCells) // max ~2.5s total reveal

  // After reveal phase (cells done + small buffer), switch to countdown
  useEffect(() => {
    const revealDuration = totalCells * cellDelay + 600
    const timer = setTimeout(() => setPhase('countdown'), revealDuration)
    return () => clearTimeout(timer)
  }, [totalCells, cellDelay])

  // Countdown 3 -> 2 -> 1 -> START! -> done
  useEffect(() => {
    if (phase !== 'countdown') return

    if (countdownNum > 0) {
      const timer = setTimeout(() => setCountdownNum((n) => n - 1), 800)
      return () => clearTimeout(timer)
    } else {
      // Show "START!" for 800ms then complete
      const timer = setTimeout(() => {
        setPhase('done')
        onComplete()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [phase, countdownNum, onComplete])

  const mapLookup = new Map<number, string>()
  maps.forEach((m) => mapLookup.set(m.position, m.mapName))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="relative w-full max-w-2xl mx-auto px-4">
        {/* Grid */}
        <div
          className="grid gap-2 w-full"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            filter: phase === 'countdown' ? 'blur(6px)' : 'none',
            transition: 'filter 0.5s ease',
          }}
        >
          {Array.from({ length: totalCells }, (_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                delay: i * (cellDelay / 1000),
                duration: 0.3,
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
              className="aspect-square flex items-center justify-center rounded-lg border-2 border-border bg-muted/30 p-1"
            >
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground leading-tight text-center line-clamp-2">
                {mapLookup.get(i) || '?'}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Countdown overlay */}
        <AnimatePresence mode="wait">
          {phase === 'countdown' && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={countdownNum}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="text-8xl sm:text-9xl font-black text-primary drop-shadow-lg select-none"
                >
                  {countdownNum > 0 ? countdownNum : 'START!'}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
