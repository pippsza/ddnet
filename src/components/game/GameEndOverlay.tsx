'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface GameEndOverlayProps {
  isWinner: boolean
  isCancelled: boolean
  winnerTeamName?: string
  onDismiss: () => void
}

export function GameEndOverlay({
  isWinner,
  isCancelled,
  winnerTeamName,
  onDismiss,
}: GameEndOverlayProps) {
  const [visible, setVisible] = useState(true)

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(onDismiss, 400)
  }, [onDismiss])

  // Auto-dismiss
  useEffect(() => {
    const ms = isCancelled ? 3000 : isWinner ? 5000 : 4000
    const timer = setTimeout(dismiss, ms)
    return () => clearTimeout(timer)
  }, [isCancelled, isWinner, dismiss])

  // Fire confetti for winner
  useEffect(() => {
    if (!isWinner || isCancelled) return
    import('canvas-confetti').then((mod) => {
      const confetti = mod.default
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } })
      setTimeout(() => {
        confetti({ particleCount: 70, spread: 100, origin: { y: 0.45, x: 0.25 } })
      }, 300)
      setTimeout(() => {
        confetti({ particleCount: 70, spread: 100, origin: { y: 0.45, x: 0.75 } })
      }, 600)
    })
  }, [isWinner, isCancelled])

  const mainText = isCancelled ? 'Game Cancelled' : isWinner ? 'Victory!' : 'Defeat'
  const textColor = isCancelled
    ? 'text-muted-foreground'
    : isWinner
      ? 'text-yellow-400 drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]'
      : 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.3)]'
  const bgOpacity = isCancelled ? 'bg-black/40' : isWinner ? 'bg-black/35' : 'bg-black/50'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer ${bgOpacity}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={dismiss}
        >
          <motion.div
            className={`text-7xl sm:text-8xl font-black ${textColor}`}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            {mainText}
          </motion.div>

          {winnerTeamName && !isCancelled && (
            <motion.div
              className="mt-4 text-xl text-white/70"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {isWinner ? `${winnerTeamName} wins!` : `${winnerTeamName} wins`}
            </motion.div>
          )}

          <motion.div
            className="mt-8 text-sm text-white/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            Click to dismiss
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
