'use client'

import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface BingoGridProps {
  size: number
  maps: { mapName: string; position: number }[]
  teams: {
    color: string
    completedCells?: { position: number; completedAt?: string }[]
  }[]
  winnerTeamIndex?: number | null
  winningCells?: number[]
  gameStatus?: string
}

export function BingoGrid({
  size,
  maps,
  teams,
  winnerTeamIndex,
  winningCells,
  gameStatus,
}: BingoGridProps) {
  const mapLookup = useMemo(() => {
    const m = new Map<number, string>()
    maps.forEach((mp) => m.set(mp.position, mp.mapName))
    return m
  }, [maps])

  const team1Cells = useMemo(
    () => new Set(teams[0]?.completedCells?.map((c) => c.position) || []),
    [teams],
  )
  const team2Cells = useMemo(
    () => new Set(teams[1]?.completedCells?.map((c) => c.position) || []),
    [teams],
  )

  const winCellSet = useMemo(() => new Set(winningCells || []), [winningCells])

  // Track previous completed cells to detect new completions
  const prevCellsRef = useRef<{ t1: Set<number>; t2: Set<number> }>({
    t1: new Set(),
    t2: new Set(),
  })
  const newlyCompleted = useMemo(() => {
    const newCells = new Set<number>()
    team1Cells.forEach((c) => {
      if (!prevCellsRef.current.t1.has(c)) newCells.add(c)
    })
    team2Cells.forEach((c) => {
      if (!prevCellsRef.current.t2.has(c)) newCells.add(c)
    })
    return newCells
  }, [team1Cells, team2Cells])

  useEffect(() => {
    prevCellsRef.current = { t1: new Set(team1Cells), t2: new Set(team2Cells) }
  }, [team1Cells, team2Cells])

  const [failedImages, setFailedImages] = useState<Set<number>>(new Set())
  const handleImageError = useCallback((position: number) => {
    setFailedImages((prev) => {
      const next = new Set(prev)
      next.add(position)
      return next
    })
  }, [])

  const isCompleted = gameStatus === 'completed' || gameStatus === 'cancelled'
  const team1Hex = TEAM_HEX[teams[0]?.color] || '#ef4444'
  const team2Hex = TEAM_HEX[teams[1]?.color] || '#3b82f6'

  return (
    <div
      className="grid gap-0.5 sm:gap-1 w-full max-h-full"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
        aspectRatio: '1',
        maxWidth: '100%',
      }}
    >
      {Array.from({ length: size * size }, (_, i) => {
        const mapName = mapLookup.get(i) || '?'
        const t1 = team1Cells.has(i)
        const t2 = team2Cells.has(i)
        const bothTeams = t1 && t2
        const anyTeam = t1 || t2
        const isWinCell = isCompleted && winCellSet.has(i)
        const isNew = newlyCompleted.has(i)

        // Determine cell background
        const cellStyle: React.CSSProperties = {}

        if (isCompleted) {
          // After game ends, use CSS primary accent for all completed cells
        } else if (bothTeams) {
          cellStyle.background = `linear-gradient(to bottom, ${team1Hex}33 0%, ${team1Hex}33 50%, ${team2Hex}33 50%, ${team2Hex}33 100%)`
          cellStyle.borderColor = `${team1Hex}80`
        } else if (t1) {
          cellStyle.backgroundColor = team1Hex + '30'
          cellStyle.borderColor = team1Hex + '80'
        } else if (t2) {
          cellStyle.backgroundColor = team2Hex + '30'
          cellStyle.borderColor = team2Hex + '80'
        }

        const showImage = mapName !== '?' && !failedImages.has(i)

        return (
          <motion.div
            key={i}
            animate={isNew ? { scale: [1, 1.12, 1] } : isWinCell ? { opacity: [0.7, 1, 0.7] } : {}}
            transition={
              isNew
                ? { duration: 0.4, ease: 'easeOut' }
                : isWinCell
                  ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                  : {}
            }
            className={cn(
              'flex items-center justify-center rounded-md border p-0.5 text-center relative overflow-hidden transition-colors duration-300',
              !anyTeam && !isCompleted && 'border-border bg-muted/30',
              isWinCell && 'shadow-lg border-2 bg-primary border-primary',
              isCompleted && !isWinCell && anyTeam && 'bg-primary/20 border-primary/40',
              isCompleted && !anyTeam && 'border-border bg-muted/30',
              !isCompleted && !isWinCell && 'border',
            )}
            style={cellStyle}
          >
            {/* Map thumbnail background */}
            {showImage && (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${getMapThumbnailUrl(mapName)})` }}
                />
                {/* Dark overlay for text readability */}
                <div
                  className={cn(
                    'absolute inset-0',
                    isWinCell
                      ? 'bg-primary/70'
                      : anyTeam && !isCompleted
                        ? 'bg-black/50'
                        : isCompleted && anyTeam
                          ? 'bg-primary/50'
                          : 'bg-black/60',
                  )}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMapThumbnailUrl(mapName)}
                  alt=""
                  onError={() => handleImageError(i)}
                  className="hidden"
                />
              </>
            )}

            {/* Completed checkmark dot */}
            {anyTeam && !isCompleted && (
              <div
                className="absolute top-0.5 right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex items-center justify-center z-10"
                style={{
                  backgroundColor: bothTeams ? team1Hex : t1 ? team1Hex : team2Hex,
                }}
              >
                <svg
                  className="w-1 h-1 sm:w-1.5 sm:h-1.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* Second team dot for both-completed cells */}
            {bothTeams && !isCompleted && (
              <div
                className="absolute top-0.5 left-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex items-center justify-center z-10"
                style={{ backgroundColor: team2Hex }}
              >
                <svg
                  className="w-1 h-1 sm:w-1.5 sm:h-1.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {isWinCell ? (
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground relative z-10" />
            ) : (
              <span
                className={cn(
                  'text-[7px] sm:text-[9px] font-semibold leading-tight line-clamp-2 relative z-10',
                  showImage
                    ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                    : anyTeam
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                )}
              >
                {mapName}
              </span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
