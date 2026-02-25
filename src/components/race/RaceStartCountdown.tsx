'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface RaceStartCountdownProps {
  pathLength: number
  maps: { mapName: string; position: number }[]
  onComplete: () => void
}

const NODE_COLOR = '#22c55e'
const NODE_PENDING = '#86efac'
const DASH_COLOR = '#bbf7d0'

export function RaceStartCountdown({ pathLength, maps, onComplete }: RaceStartCountdownProps) {
  const [phase, setPhase] = useState<'reveal' | 'countdown' | 'done'>('reveal')
  const [countdownNum, setCountdownNum] = useState(3)

  const mapLookup = useMemo(() => {
    const m = new Map<number, string>()
    maps.forEach((mp) => m.set(mp.position, mp.mapName))
    return m
  }, [maps])

  // Layout: zigzag path
  const cols = Math.min(Math.max(pathLength, 3), 5)
  const rows = Math.ceil(pathLength / cols)

  const positions = useMemo(() => {
    const pos: { x: number; y: number; index: number }[] = []
    for (let row = 0; row < rows; row++) {
      const isReversed = row % 2 === 1
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col
        if (index >= pathLength) break
        const actualCol = isReversed ? cols - 1 - col : col
        pos.push({ x: actualCol, y: row, index })
      }
    }
    return pos
  }, [rows, cols, pathLength])

  const cellW = 110
  const cellH = 90
  const padX = 50
  const padY = 40
  const svgW = cols * cellW + padX * 2
  const svgH = rows * cellH + padY * 2
  const nodeR = 20

  const getCenter = (pos: { x: number; y: number }) => ({
    cx: padX + pos.x * cellW + cellW / 2,
    cy: padY + pos.y * cellH + cellH / 2,
  })

  // Stagger delay per node
  const nodeDelay = Math.min(150, 2500 / pathLength)

  // After reveal, switch to countdown
  useEffect(() => {
    const revealDuration = pathLength * nodeDelay + 600
    const timer = setTimeout(() => setPhase('countdown'), revealDuration)
    return () => clearTimeout(timer)
  }, [pathLength, nodeDelay])

  // Countdown 3 -> 2 -> 1 -> START! -> done
  useEffect(() => {
    if (phase !== 'countdown') return

    if (countdownNum > 0) {
      const timer = setTimeout(() => setCountdownNum((n) => n - 1), 800)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => {
        setPhase('done')
        onComplete()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [phase, countdownNum, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="relative w-full max-w-2xl mx-auto px-4">
        {/* Race path */}
        <div
          style={{
            filter: phase === 'countdown' ? 'blur(6px)' : 'none',
            transition: 'filter 0.5s ease',
          }}
        >
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full max-w-2xl mx-auto"
          >
            {/* Connection lines — reveal with nodes */}
            {positions.map((pos, i) => {
              if (i === 0) return null
              const prev = positions[i - 1]
              const from = getCenter(prev)
              const to = getCenter(pos)
              return (
                <motion.line
                  key={`line-${i}`}
                  x1={from.cx}
                  y1={from.cy}
                  x2={to.cx}
                  y2={to.cy}
                  stroke={DASH_COLOR}
                  strokeWidth={2}
                  strokeDasharray="8 5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    delay: (i - 1) * (nodeDelay / 1000) + 0.15,
                    duration: 0.3,
                  }}
                />
              )
            })}

            {/* Nodes */}
            {positions.map((pos) => {
              const { cx, cy } = getCenter(pos)
              const mapName = mapLookup.get(pos.index)
              const label = mapName || '?'
              const isFirst = pos.index === 0
              const isLast = pos.index === pathLength - 1

              return (
                <g key={`node-${pos.index}`}>
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={nodeR}
                    fill={isFirst || isLast ? NODE_COLOR : NODE_PENDING}
                    stroke={isFirst || isLast ? NODE_COLOR : '#a7f3d0'}
                    strokeWidth={isFirst || isLast ? 3 : 2}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: isFirst || isLast ? 1 : 0.7 }}
                    transition={{
                      delay: pos.index * (nodeDelay / 1000),
                      duration: 0.3,
                      type: 'spring',
                      stiffness: 300,
                      damping: 20,
                    }}
                  />
                  {/* Node number */}
                  <motion.text
                    x={cx}
                    y={cy + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={12}
                    fontWeight="bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: pos.index * (nodeDelay / 1000) + 0.1 }}
                  >
                    {pos.index + 1}
                  </motion.text>
                  {/* Map name */}
                  <motion.foreignObject
                    x={cx - cellW / 2}
                    y={cy + nodeR + 4}
                    width={cellW}
                    height={20}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: pos.index * (nodeDelay / 1000) + 0.2 }}
                  >
                    <span
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        fontSize: 10,
                        fontWeight: 500,
                        color: 'var(--foreground)',
                        lineHeight: '1',
                      }}
                    >
                      {label.length > 14 ? label.slice(0, 13) + '\u2026' : label}
                    </span>
                  </motion.foreignObject>
                </g>
              )
            })}
          </svg>
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
