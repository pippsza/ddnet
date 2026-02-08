'use client'

interface Round {
  roundNumber: number
  mapName: string
  winner?: string | { id: string; username?: string }
  finishTime?: number
}

interface RacePlayer {
  id: string
  username: string
  color?: string
}

interface RaceMapProps {
  rounds: Round[]
  totalRounds: number
  currentRound: number
  players: RacePlayer[]
}

const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
const DEFAULT_NODE_COLOR = '#22c55e' // green-500
const PENDING_NODE_COLOR = '#86efac' // green-300
const DASHED_LINE_COLOR = '#bbf7d0' // green-200

export function RaceMap({ rounds, totalRounds, currentRound, players }: RaceMapProps) {
  const cols = Math.min(totalRounds, 5)
  const rows = Math.ceil(totalRounds / cols)

  // Build zigzag positions (like a board game snake)
  const positions: { x: number; y: number; index: number }[] = []
  for (let row = 0; row < rows; row++) {
    const isReversed = row % 2 === 1
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col
      if (index >= totalRounds) break
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

  const getWinnerColor = (round: Round): string | null => {
    if (!round.winner) return null
    const winnerId = typeof round.winner === 'string' ? round.winner : round.winner.id
    const playerIdx = players.findIndex((p) => p.id === winnerId)
    if (playerIdx < 0) return PLAYER_COLORS[0]
    return PLAYER_COLORS[playerIdx % PLAYER_COLORS.length]
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full max-w-3xl mx-auto"
        style={{ minWidth: 360 }}
      >
        {/* Connection lines */}
        {positions.map((pos, i) => {
          if (i === 0) return null
          const prev = positions[i - 1]
          const from = getCenter(prev)
          const to = getCenter(pos)
          const prevRound = rounds[prev.index]
          const isCompleted = prevRound?.winner != null

          return (
            <line
              key={`line-${i}`}
              x1={from.cx}
              y1={from.cy}
              x2={to.cx}
              y2={to.cy}
              stroke={isCompleted ? (getWinnerColor(prevRound) || DEFAULT_NODE_COLOR) : DASHED_LINE_COLOR}
              strokeWidth={isCompleted ? 3 : 2}
              strokeDasharray={isCompleted ? undefined : '8 5'}
              strokeLinecap="round"
            />
          )
        })}

        {/* Round nodes */}
        {positions.map((pos) => {
          const { cx, cy } = getCenter(pos)
          const round = rounds[pos.index]
          const isCurrent = pos.index + 1 === currentRound
          const isCompleted = round?.winner != null
          const winnerColor = round ? getWinnerColor(round) : null
          const isPending = !isCompleted && !isCurrent
          const mapName = round?.mapName || `Round ${pos.index + 1}`

          const fillColor = isCompleted
            ? (winnerColor || DEFAULT_NODE_COLOR)
            : isCurrent
              ? DEFAULT_NODE_COLOR
              : PENDING_NODE_COLOR

          const strokeColor = isCompleted
            ? (winnerColor || DEFAULT_NODE_COLOR)
            : isCurrent
              ? DEFAULT_NODE_COLOR
              : '#a7f3d0'

          return (
            <g key={`node-${pos.index}`}>
              {/* Pulse animation for current round */}
              {isCurrent && (
                <circle cx={cx} cy={cy} r={nodeR} fill="none" stroke={DEFAULT_NODE_COLOR} strokeWidth={2}>
                  <animate attributeName="r" from={nodeR} to={nodeR + 12} dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Node circle */}
              <circle
                cx={cx}
                cy={cy}
                r={nodeR}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isCurrent ? 3 : 2}
                opacity={isPending ? 0.5 : 1}
              />

              {/* Round number */}
              <text
                x={cx}
                y={cy + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={13}
                fontWeight="bold"
              >
                {pos.index + 1}
              </text>

              {/* Map name label */}
              <text
                x={cx}
                y={cy + nodeR + 14}
                textAnchor="middle"
                fill="hsl(var(--foreground))"
                fontSize={9}
                fontWeight="500"
              >
                {truncate(mapName, 14)}
              </text>

              {/* Winner name + time for completed rounds */}
              {isCompleted && round?.winner && (
                <text
                  x={cx}
                  y={cy + nodeR + 26}
                  textAnchor="middle"
                  fill="hsl(var(--muted-foreground))"
                  fontSize={8}
                >
                  {typeof round.winner === 'object' ? round.winner.username : ''}
                  {round.finishTime ? ` ${formatTime(round.finishTime)}` : ''}
                </text>
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

function formatTime(seconds: number) {
  const min = Math.floor(seconds / 60)
  const sec = (seconds % 60).toFixed(1)
  return `${min}:${sec.padStart(4, '0')}`
}
