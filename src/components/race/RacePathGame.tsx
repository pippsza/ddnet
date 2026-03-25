'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'

function getMapThumbnailUrl(mapName: string): string {
  return `https://ddnet.org/ranks/maps/${mapName.replace(/ /g, '_')}.png`
}

const TEAM_HEX: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
}

interface RacePathGameProps {
  pathLength: number
  maps: { mapName: string; position: number }[]
  teams: {
    color: string
    score: number
    completedSteps?: { position: number; completedAt?: string; finishTime?: number }[]
  }[]
  currentStep: number
  winnerTeamIndex?: number | null
  gameStatus?: string
  categoryMode?: string
}

export function RacePathGame({
  pathLength,
  maps,
  teams,
  currentStep,
  winnerTeamIndex,
  gameStatus,
  categoryMode,
}: RacePathGameProps) {
  const mapLookup = useMemo(() => {
    const m = new Map<number, string>()
    maps.forEach((mp) => m.set(mp.position, mp.mapName))
    return m
  }, [maps])

  const team1Steps = useMemo(
    () => new Set(teams[0]?.completedSteps?.map((s) => s.position) || []),
    [teams],
  )
  const team2Steps = useMemo(
    () => new Set(teams[1]?.completedSteps?.map((s) => s.position) || []),
    [teams],
  )

  // Track new completions for animation
  const prevRef = useRef<{ t1: Set<number>; t2: Set<number> }>({
    t1: new Set(),
    t2: new Set(),
  })
  const newlyCompleted = useMemo(() => {
    const newCells = new Set<number>()
    team1Steps.forEach((c) => {
      if (!prevRef.current.t1.has(c)) newCells.add(c)
    })
    team2Steps.forEach((c) => {
      if (!prevRef.current.t2.has(c)) newCells.add(c)
    })
    return newCells
  }, [team1Steps, team2Steps])

  useEffect(() => {
    prevRef.current = { t1: new Set(team1Steps), t2: new Set(team2Steps) }
  }, [team1Steps, team2Steps])

  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())
  const handleImageError = useCallback((index: number) => {
    setFailedImages((prev) => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
  }, [])

  const isCompleted = gameStatus === 'completed' || gameStatus === 'cancelled'
  const team1Hex = TEAM_HEX[teams[0]?.color] || '#ef4444'
  const team2Hex = TEAM_HEX[teams[1]?.color] || '#3b82f6'

  const cols = Math.min(pathLength, 5)
  const rows = Math.ceil(pathLength / cols)

  const positions: { x: number; y: number; index: number }[] = []
  for (let row = 0; row < rows; row++) {
    const isReversed = row % 2 === 1
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col
      if (index >= pathLength) break
      const actualCol = isReversed ? cols - 1 - col : col
      positions.push({ x: actualCol, y: row, index })
    }
  }

  const cellW = 120
  const cellH = 100
  const padX = 60
  const padY = 50
  const svgW = cols * cellW + padX * 2
  const svgH = rows * cellH + padY * 2
  const nodeR = 22

  const getCenter = (pos: { x: number; y: number }) => ({
    cx: padX + pos.x * cellW + cellW / 2,
    cy: padY + pos.y * cellH + cellH / 2,
  })

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full max-w-3xl mx-auto"
        style={{ minWidth: 360 }}
      >
        <defs>
          <clipPath id="race-game-node-clip">
            <circle cx="0" cy="0" r={nodeR} />
          </clipPath>
        </defs>

        {/* Connection lines */}
        {positions.map((pos, i) => {
          if (i === 0) return null
          const prev = positions[i - 1]
          const from = getCenter(prev)
          const to = getCenter(pos)
          const prevCompleted = team1Steps.has(prev.index) || team2Steps.has(prev.index)
          const prevTeam1 = team1Steps.has(prev.index)

          return (
            <line
              key={`line-${i}`}
              x1={from.cx}
              y1={from.cy}
              x2={to.cx}
              y2={to.cy}
              stroke={
                isCompleted
                  ? 'hsl(var(--primary))'
                  : prevCompleted
                    ? (prevTeam1 ? team1Hex : team2Hex)
                    : '#bbf7d0'
              }
              strokeWidth={prevCompleted ? 3 : 2}
              strokeDasharray={prevCompleted ? undefined : '8 5'}
              strokeLinecap="round"
            />
          )
        })}

        {/* Nodes */}
        {positions.map((pos) => {
          const { cx, cy } = getCenter(pos)
          const mapName = mapLookup.get(pos.index) || (categoryMode === 'free' ? '?' : `Step ${pos.index + 1}`)
          const t1 = team1Steps.has(pos.index)
          const t2 = team2Steps.has(pos.index)
          const anyTeam = t1 || t2
          const isCurrent = pos.index === currentStep && !isCompleted
          const isNew = newlyCompleted.has(pos.index)
          const isPending = !anyTeam && !isCurrent
          const showImage = mapName !== '?' && !mapName.startsWith('Step ') && !failedImages.has(pos.index)

          const fillColor = isCompleted && anyTeam
            ? 'hsl(var(--primary))'
            : t1
              ? team1Hex
              : t2
                ? team2Hex
                : isCurrent
                  ? '#22c55e'
                  : '#86efac'

          const strokeColor = isCompleted && anyTeam
            ? 'hsl(var(--primary))'
            : t1
              ? team1Hex
              : t2
                ? team2Hex
                : isCurrent
                  ? '#22c55e'
                  : '#a7f3d0'

          return (
            <g key={`node-${pos.index}`}>
              {/* Pulse for current step */}
              {isCurrent && (
                <circle cx={cx} cy={cy} r={nodeR} fill="none" stroke="#22c55e" strokeWidth={2}>
                  <animate attributeName="r" from={nodeR} to={nodeR + 12} dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Base circle */}
              {isNew ? (
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={nodeR}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isCurrent ? 3 : 2}
                  animate={{ r: [nodeR * 0.8, nodeR * 1.15, nodeR] }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              ) : (
                <circle
                  cx={cx}
                  cy={cy}
                  r={nodeR}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isCurrent ? 3 : 2}
                  opacity={isPending ? 0.5 : 1}
                />
              )}

              {/* Map thumbnail inside circle */}
              {showImage && (
                <g transform={`translate(${cx}, ${cy})`} clipPath="url(#race-game-node-clip)">
                  <image
                    href={getMapThumbnailUrl(mapName)}
                    x={-nodeR}
                    y={-nodeR}
                    width={nodeR * 2}
                    height={nodeR * 2}
                    preserveAspectRatio="xMidYMid slice"
                    onError={() => handleImageError(pos.index)}
                  />
                  <rect
                    x={-nodeR}
                    y={-nodeR}
                    width={nodeR * 2}
                    height={nodeR * 2}
                    fill={anyTeam ? fillColor : isCurrent ? '#22c55e' : 'black'}
                    opacity={anyTeam ? 0.5 : isCurrent ? 0.45 : 0.5}
                  />
                </g>
              )}

              {/* Stroke ring on top */}
              <circle
                cx={cx}
                cy={cy}
                r={nodeR}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isCurrent ? 3 : 2}
                opacity={isPending ? 0.5 : 1}
              />

              {/* Node number or trophy */}
              {isCompleted && anyTeam && winnerTeamIndex != null ? (
                <foreignObject x={cx - 8} y={cy - 8} width={16} height={16}>
                  <Trophy className="h-4 w-4 text-primary-foreground" />
                </foreignObject>
              ) : (
                <text
                  x={cx}
                  y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={13}
                  fontWeight="bold"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                >
                  {pos.index + 1}
                </text>
              )}

              {/* Map name */}
              <foreignObject
                x={cx - cellW / 2}
                y={cy + nodeR + 4}
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
                  {truncate(mapName, 14)}
                </span>
              </foreignObject>

              {/* Team color dot indicator */}
              {anyTeam && !isCompleted && (
                <circle
                  cx={cx + nodeR - 4}
                  cy={cy - nodeR + 4}
                  r={5}
                  fill={t1 ? team1Hex : team2Hex}
                  stroke="white"
                  strokeWidth={1.5}
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str
}
