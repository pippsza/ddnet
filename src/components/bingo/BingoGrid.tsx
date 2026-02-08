'use client'

import { cn } from '@/lib/utils'

interface BingoGridProps {
  size: number
  maps: { mapName: string; position: number }[]
  teams: {
    color: string
    completedCells?: { position: number; completedAt?: string }[]
  }[]
}

const colorMap: Record<string, { bg: string; border: string }> = {
  red: { bg: 'bg-red-500/20', border: 'border-red-500/50' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/50' },
  green: { bg: 'bg-green-500/20', border: 'border-green-500/50' },
  yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50' },
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/50' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/50' },
}

const colorFills: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
}

export function BingoGrid({ size, maps, teams }: BingoGridProps) {
  const mapLookup = new Map<number, string>()
  maps.forEach((m) => mapLookup.set(m.position, m.mapName))

  const team1Cells = new Set(teams[0]?.completedCells?.map((c) => c.position) || [])
  const team2Cells = new Set(teams[1]?.completedCells?.map((c) => c.position) || [])

  const getTeamIndex = (position: number): number | null => {
    if (team1Cells.has(position)) return 0
    if (team2Cells.has(position)) return 1
    return null
  }

  return (
    <div
      className="grid gap-2 w-full max-w-2xl mx-auto"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: size * size }, (_, i) => {
        const teamIdx = getTeamIndex(i)
        const isCompleted = teamIdx !== null
        const teamColor = teamIdx !== null ? teams[teamIdx]?.color : null
        const mapName = mapLookup.get(i) || '?'

        return (
          <div
            key={i}
            className={cn(
              'aspect-square flex flex-col items-center justify-center rounded-lg border-2 p-1.5 text-center transition-all duration-300 relative overflow-hidden',
              isCompleted
                ? cn(
                    colorMap[teamColor || 'blue']?.bg || 'bg-blue-500/20',
                    colorMap[teamColor || 'blue']?.border || 'border-blue-500/50',
                  )
                : 'border-border bg-muted/30 hover:bg-muted/60 hover:border-muted-foreground/30',
            )}
          >
            {/* Completed indicator */}
            {isCompleted && (
              <div className={cn(
                'absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center',
                colorFills[teamColor || 'blue'] || 'bg-blue-500',
              )}>
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            <span className={cn(
              'text-[10px] sm:text-xs font-medium leading-tight line-clamp-2',
              isCompleted ? 'text-foreground' : 'text-muted-foreground',
            )}>
              {mapName}
            </span>
          </div>
        )
      })}
    </div>
  )
}
