'use client'

import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { cn } from '@/lib/utils'

interface BingoPlayer {
  id: string
  username: string
  points?: number
  skin?: { name: string; colorBody: number; colorFeet: number } | null
  isReady: boolean
}

interface BingoPlayerCardProps {
  team: {
    name: string
    color: string
    status: string
    players: BingoPlayer[]
    completedCells?: { position: number }[]
  }
}

const TEAM_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
}

export function PlayerCard({ team }: BingoPlayerCardProps) {
  const isWinner = team.status === 'winner'
  const completedCount = team.completedCells?.length || 0
  const teamHex = TEAM_COLORS[team.color] || team.color

  return (
    <Card className={cn(
      'transition-all',
      isWinner && 'ring-2 ring-green-500/50 border-green-500/30',
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: teamHex }}
            />
            <span className="font-semibold">{team.name}</span>
            {isWinner && <StatusBadge status="winner" />}
          </div>
          <span className="text-sm text-muted-foreground">
            {completedCount} cell{completedCount !== 1 ? 's' : ''} completed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {team.players?.map((player) => {
            const skinUrl = player.skin?.name
              ? getDDNetSkinUrl(player.skin.name)
              : undefined

            return (
              <div
                key={player.id}
                className={cn(
                  'flex items-center gap-3 p-2.5 rounded-lg border bg-card',
                  'border-l-2',
                )}
                style={{ borderLeftColor: teamHex }}
              >
                <TeeAvatarWithFallback
                  skinUrl={skinUrl}
                  bodyColor={player.skin?.colorBody}
                  feetColor={player.skin?.colorFeet}
                  size="sm"
                  useCustomColors={!!(player.skin?.colorBody || player.skin?.colorFeet)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">
                    {player.username}
                  </span>
                  {player.points !== undefined && player.points > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {player.points.toLocaleString()} pts
                    </span>
                  )}
                </div>
                <span className={cn(
                  'w-2.5 h-2.5 rounded-full flex-shrink-0',
                  player.isReady ? 'bg-green-500' : 'bg-gray-400',
                )} />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
