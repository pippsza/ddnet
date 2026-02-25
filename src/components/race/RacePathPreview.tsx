'use client'

import React, { useMemo, useCallback } from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import { Plus, Minus, Route } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RacePathPreviewProps {
  pathLength: number
  maps?: { mapName: string; position: number }[]
  categoryMode?: 'selected' | 'free'
  /** If provided, the preview becomes interactive (add/remove nodes) */
  onPathLengthChange?: (length: number) => void
  minLength?: number
  maxLength?: number
  disabled?: boolean
}

const PLACEHOLDER_MAPS = [
  'Kobra 4', 'Multeasymap', 'Sunny Side', 'NUT', 'Absurd 3',
  'Epix 2', 'Baby Aim', 'Stardust', 'Mirage', 'Blizzard',
  'Crimson', 'Aurora', 'Nebula', 'Vortex', 'Thunder',
  'Crystal', 'Ember', 'Zenith', 'Drift', 'Pulse',
]

const NODE_COLOR = '#22c55e'
const NODE_PENDING = '#86efac'
const DASH_COLOR = '#bbf7d0'

export function RacePathPreview({
  pathLength,
  maps,
  categoryMode,
  onPathLengthChange,
  minLength = 3,
  maxLength = 20,
  disabled,
}: RacePathPreviewProps) {
  const interactive = !!onPathLengthChange && !disabled

  const mapLookup = useMemo(() => {
    const m = new Map<number, string>()
    maps?.forEach((mp) => m.set(mp.position, mp.mapName))
    return m
  }, [maps])

  const canAdd = interactive && pathLength < maxLength
  const canRemove = interactive && pathLength > minLength

  // Total display length: real nodes + 1 ghost if can add
  const displayLength = pathLength + (canAdd ? 1 : 0)

  const cols = Math.min(Math.max(displayLength, 3), 5)
  const rows = Math.ceil(displayLength / cols)

  // Build zigzag positions
  const positions = useMemo(() => {
    const pos: { x: number; y: number; index: number; isGhost: boolean }[] = []
    for (let row = 0; row < rows; row++) {
      const isReversed = row % 2 === 1
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col
        if (index >= displayLength) break
        const actualCol = isReversed ? cols - 1 - col : col
        pos.push({ x: actualCol, y: row, index, isGhost: index >= pathLength })
      }
    }
    return pos
  }, [rows, cols, displayLength, pathLength])

  const cellW = 110
  const cellH = 90
  const padX = 50
  const padY = 40
  const svgW = cols * cellW + padX * 2
  const svgH = rows * cellH + padY * 2
  const nodeR = 18

  const getCenter = (pos: { x: number; y: number }) => ({
    cx: padX + pos.x * cellW + cellW / 2,
    cy: padY + pos.y * cellH + cellH / 2,
  })

  const handleAdd = useCallback(() => {
    if (canAdd) onPathLengthChange!(pathLength + 1)
  }, [canAdd, onPathLengthChange, pathLength])

  const handleRemove = useCallback(() => {
    if (canRemove) onPathLengthChange!(pathLength - 1)
  }, [canRemove, onPathLengthChange, pathLength])

  return (
    <div className={cn('flex flex-col items-center gap-3 max-h-full w-full', disabled && 'pointer-events-none opacity-60')}>
      <LayoutGroup>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full max-w-2xl mx-auto"
            style={{ minWidth: 300 }}
          >
            {/* Connection lines */}
            {positions.map((pos, i) => {
              if (i === 0) return null
              const prev = positions[i - 1]
              const from = getCenter(prev)
              const to = getCenter(pos)
              return (
                <line
                  key={`line-${i}`}
                  x1={from.cx}
                  y1={from.cy}
                  x2={to.cx}
                  y2={to.cy}
                  stroke={DASH_COLOR}
                  strokeWidth={2}
                  strokeDasharray="8 5"
                  strokeLinecap="round"
                  opacity={pos.isGhost ? 0.3 : 1}
                />
              )
            })}

            {/* Nodes */}
            {positions.map((pos) => {
              const { cx, cy } = getCenter(pos)

              // Ghost node: "+" button to add
              if (pos.isGhost) {
                return (
                  <g
                    key={`ghost-${pos.index}`}
                    onClick={handleAdd}
                    className="cursor-pointer"
                    role="button"
                  >
                    <motion.circle
                      layoutId={`node-${pos.index}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      cx={cx}
                      cy={cy}
                      r={nodeR}
                      fill="none"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      opacity={0.3}
                      className="hover:opacity-60 transition-opacity"
                    />
                    <text
                      x={cx}
                      y={cy + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="hsl(var(--muted-foreground))"
                      fontSize={16}
                      fontWeight="bold"
                      opacity={0.4}
                    >
                      +
                    </text>
                  </g>
                )
              }

              const mapName = mapLookup.get(pos.index)
              const label = mapName
                || (categoryMode === 'free' ? '?' : PLACEHOLDER_MAPS[pos.index % PLACEHOLDER_MAPS.length])
              const isFirst = pos.index === 0
              const isLast = pos.index === pathLength - 1
              const isRemovable = interactive && canRemove && isLast

              return (
                <g
                  key={`node-${pos.index}`}
                  onClick={isRemovable ? handleRemove : undefined}
                  className={isRemovable ? 'cursor-pointer group' : undefined}
                  role={isRemovable ? 'button' : undefined}
                >
                  <motion.circle
                    layoutId={`node-${pos.index}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      layout: { duration: 0.3, ease: 'easeInOut' },
                      scale: { duration: 0.25 },
                    }}
                    cx={cx}
                    cy={cy}
                    r={nodeR}
                    fill={isFirst || isLast ? NODE_COLOR : NODE_PENDING}
                    stroke={isFirst || isLast ? NODE_COLOR : '#a7f3d0'}
                    strokeWidth={isFirst || isLast ? 3 : 2}
                    opacity={isFirst || isLast ? 1 : 0.7}
                  />

                  {/* Removable hover overlay */}
                  {isRemovable && (
                    <>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={nodeR}
                        fill="hsl(var(--destructive))"
                        opacity={0}
                        className="group-hover:opacity-80 transition-opacity duration-200"
                      />
                      <text
                        x={cx}
                        y={cy + 1}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="white"
                        fontSize={16}
                        fontWeight="bold"
                        opacity={0}
                        className="group-hover:opacity-100 transition-opacity duration-200"
                      >
                        −
                      </text>
                    </>
                  )}

                  {/* Node number (hidden on hover when removable) */}
                  <text
                    x={cx}
                    y={cy + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={11}
                    fontWeight="bold"
                    className={isRemovable ? 'group-hover:opacity-0 transition-opacity duration-200' : undefined}
                  >
                    {pos.index + 1}
                  </text>

                  {/* Map name label */}
                  <foreignObject
                    x={cx - cellW / 2}
                    y={cy + nodeR + 2}
                    width={cellW}
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
                      {truncate(label, 14)}
                    </span>
                  </foreignObject>
                </g>
              )
            })}
          </svg>
        </div>
      </LayoutGroup>

      {/* Step count + controls */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
        {interactive && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={!canRemove}
            className={cn(
              'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
              canRemove
                ? 'border-destructive/50 text-destructive hover:bg-destructive/10'
                : 'border-muted-foreground/20 text-muted-foreground/30 cursor-not-allowed',
            )}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <Route className="h-3.5 w-3.5" />
          <span>{pathLength} steps</span>
          {maxLength < 20 && (
            <span className="text-muted-foreground/60">(max {maxLength})</span>
          )}
        </div>
        {interactive && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className={cn(
              'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
              canAdd
                ? 'border-primary/50 text-primary hover:bg-primary/10'
                : 'border-muted-foreground/20 text-muted-foreground/30 cursor-not-allowed',
            )}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str
}
