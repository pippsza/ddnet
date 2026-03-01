'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import { Trophy } from 'lucide-react'

const NODE_COUNT = 8
const COLS = 4
const NODE_DELAY = 800
const CELEBRATE_DURATION = 3000
const RESET_DURATION = 1000

const CELL_W = 110
const CELL_H = 90
const PAD_X = 50
const PAD_Y = 40
const NODE_R = 20

const MAP_NAMES = [
  'Kobra 4', 'Binary', 'Sunny Side', 'FlipFlop',
  'Narcis', 'Crystal', 'Stardust', 'Zenith',
]

type Phase = 'playing' | 'celebrating' | 'resetting'

function buildPositions() {
  const positions: { x: number; y: number; index: number }[] = []
  const rows = Math.ceil(NODE_COUNT / COLS)
  for (let row = 0; row < rows; row++) {
    const reversed = row % 2 === 1
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col
      if (index >= NODE_COUNT) break
      const actualCol = reversed ? COLS - 1 - col : col
      positions.push({ x: actualCol, y: row, index })
    }
  }
  return positions
}

function getCenter(pos: { x: number; y: number }) {
  return {
    cx: PAD_X + pos.x * CELL_W + CELL_W / 2,
    cy: PAD_Y + pos.y * CELL_H + CELL_H / 2,
  }
}

function buildCurvePath(from: { cx: number; cy: number }, to: { cx: number; cy: number }) {
  const dx = to.cx - from.cx
  const dy = to.cy - from.cy
  const isVerticalTransition = Math.abs(dy) > Math.abs(dx) * 0.5

  if (isVerticalTransition) {
    // S-curve for row transitions
    return `M ${from.cx} ${from.cy} C ${from.cx} ${from.cy + 35} ${to.cx} ${to.cy - 35} ${to.cx} ${to.cy}`
  }
  // Arc for horizontal connections
  const midX = (from.cx + to.cx) / 2
  const midY = (from.cy + to.cy) / 2 - 14 * (dx > 0 ? 1 : -1)
  return `M ${from.cx} ${from.cy} Q ${midX} ${midY} ${to.cx} ${to.cy}`
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str
}

export function RaceDemo({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { amount: 0.3 })
  const [completedCount, setCompletedCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('playing')
  const [latestNode, setLatestNode] = useState(-1)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const confettiFiredRef = useRef(false)

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const reset = useCallback(() => {
    clearTimers()
    setCompletedCount(0)
    setPhase('playing')
    setLatestNode(-1)
    confettiFiredRef.current = false
  }, [clearTimers])

  // Main animation loop
  useEffect(() => {
    if (!isInView || phase !== 'playing') return
    if (completedCount >= NODE_COUNT) return

    const timer = setTimeout(() => {
      const next = completedCount
      setLatestNode(next)
      setCompletedCount((c) => c + 1)

      if (next === NODE_COUNT - 1) {
        setPhase('celebrating')
      }
    }, completedCount === 0 ? 800 : NODE_DELAY)

    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [isInView, phase, completedCount])

  // Celebration
  useEffect(() => {
    if (phase !== 'celebrating' || confettiFiredRef.current) return
    confettiFiredRef.current = true

    import('canvas-confetti').then((mod) => {
      const confetti = mod.default
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
      setTimeout(() => confetti({ particleCount: 60, spread: 90, origin: { y: 0.5, x: 0.3 } }), 300)
      setTimeout(() => confetti({ particleCount: 60, spread: 90, origin: { y: 0.5, x: 0.7 } }), 600)
    })

    const timer = setTimeout(() => setPhase('resetting'), CELEBRATE_DURATION)
    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [phase])

  // Reset
  useEffect(() => {
    if (phase !== 'resetting') return
    const timer = setTimeout(reset, RESET_DURATION)
    timersRef.current.push(timer)
    return () => clearTimeout(timer)
  }, [phase, reset])

  // Pause when out of view
  useEffect(() => {
    if (!isInView) clearTimers()
  }, [isInView, clearTimers])

  useEffect(() => () => clearTimers(), [clearTimers])

  const positions = buildPositions()
  const rows = Math.ceil(NODE_COUNT / COLS)
  const svgW = COLS * CELL_W + PAD_X * 2
  const svgH = rows * CELL_H + PAD_Y * 2
  const allDone = phase === 'celebrating' || phase === 'resetting'

  return (
    <div ref={containerRef} className={className}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full max-w-2xl mx-auto"
        style={{ minWidth: 300 }}
      >
        {/* Glow filter */}
        <defs>
          <filter id="race-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection lines */}
        {positions.map((pos, i) => {
          if (i === 0) return null
          const prev = positions[i - 1]
          const from = getCenter(prev)
          const to = getCenter(pos)
          const prevDone = prev.index < completedCount
          const d = buildCurvePath(from, to)

          return (
            <path
              key={`line-${i}`}
              d={d}
              fill="none"
              stroke={prevDone ? 'var(--primary)' : 'var(--muted-foreground)'}
              strokeWidth={prevDone ? 3 : 2}
              strokeDasharray={prevDone ? undefined : '8 5'}
              strokeLinecap="round"
              opacity={prevDone ? 1 : 0.3}
              filter={prevDone ? 'url(#race-glow)' : undefined}
            />
          )
        })}

        {/* Nodes */}
        {positions.map((pos) => {
          const { cx, cy } = getCenter(pos)
          const isDone = pos.index < completedCount
          const isCurrent = pos.index === completedCount && phase === 'playing'
          const isNew = pos.index === latestNode && isDone
          const isFinish = pos.index === NODE_COUNT - 1 && allDone

          const fillColor = isDone
            ? 'var(--primary)'
            : isCurrent
              ? 'var(--chart-2)'
              : 'var(--muted)'

          return (
            <g key={`node-${pos.index}`}>
              {/* Pulse for current step */}
              {isCurrent && (
                <circle cx={cx} cy={cy} r={NODE_R} fill="none" stroke="var(--chart-2)" strokeWidth={2}>
                  <animate attributeName="r" from={NODE_R} to={NODE_R + 12} dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Node circle */}
              {isNew ? (
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={NODE_R}
                  fill={fillColor}
                  stroke="var(--primary)"
                  strokeWidth={2}
                  animate={{ r: [NODE_R * 0.8, NODE_R * 1.15, NODE_R] }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={NODE_R}
                  fill={fillColor}
                  stroke={isDone ? 'var(--primary)' : 'var(--border)'}
                  strokeWidth={2}
                  opacity={isDone || isCurrent ? 1 : 0.5}
                />
              )}

              {/* Node content */}
              {isFinish ? (
                <foreignObject x={cx - 8} y={cy - 8} width={16} height={16}>
                  <Trophy className="h-4 w-4 text-primary-foreground" />
                </foreignObject>
              ) : (
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isDone || isCurrent ? 'white' : 'var(--muted-foreground)'}
                  fontSize={12}
                  fontWeight="bold"
                >
                  {pos.index + 1}
                </text>
              )}

              {/* Map name */}
              <foreignObject
                x={cx - CELL_W / 2}
                y={cy + NODE_R + 4}
                width={CELL_W}
                height={20}
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
                  {truncate(MAP_NAMES[pos.index] || `Step ${pos.index + 1}`, 12)}
                </span>
              </foreignObject>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
