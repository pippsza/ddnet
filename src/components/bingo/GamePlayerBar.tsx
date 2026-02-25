'use client'

import Link from 'next/link'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Trophy, Crown, Shield } from 'lucide-react'

const TEAM_HEX: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
}

interface Player {
  id: string
  username: string
  points?: number
  skin?: { name: string; colorBody: number; colorFeet: number } | null
  roles?: string
}

interface GamePlayerBarProps {
  team: {
    name: string
    color: string
    players: Player[]
    completedCells?: { position: number }[]
  }
  totalCells: number
  isWinner?: boolean
  label?: string
  creatorId?: string
}

export function GamePlayerBar({ team, totalCells, isWinner, label, creatorId }: GamePlayerBarProps) {
  const teamHex = TEAM_HEX[team.color] || '#3b82f6'
  const completedCount = team.completedCells?.length || 0

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-1.5 rounded-lg border bg-card/50 backdrop-blur-sm transition-all',
        isWinner && 'ring-2 ring-green-500/50 border-green-500/30 bg-green-500/5',
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: teamHex }}
    >
      {/* Players */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {team.players.map((player) => {
          const skinUrl = player.skin?.name ? getDDNetSkinUrl(player.skin.name) : undefined
          const isHost = creatorId === player.id
          return (
            <Link
              key={player.id}
              href={`/app/players/${encodeURIComponent(player.username)}`}
              className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
            >
              <TeeAvatarWithFallback
                skinUrl={skinUrl}
                bodyColor={player.skin?.colorBody}
                feetColor={player.skin?.colorFeet}
                size="xs"
                useCustomColors={!!(player.skin?.colorBody || player.skin?.colorFeet)}
              />
              <div className="min-w-0 flex items-center gap-1.5">
                <span className="text-sm font-medium truncate leading-tight">
                  {player.username}
                </span>
                {isHost && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/50 text-amber-500 gap-0.5">
                    <Crown className="h-2.5 w-2.5" />
                    Host
                  </Badge>
                )}
                {player.roles === 'admin' && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-red-500/50 text-red-500 gap-0.5">
                    <Shield className="h-2.5 w-2.5" />
                    Admin
                  </Badge>
                )}
                {player.points != null && player.points > 0 && (
                  <span className="text-[10px] text-muted-foreground leading-none">
                    {player.points.toLocaleString()} pts
                  </span>
                )}
              </div>
            </Link>
          )
        })}
        {team.players.length === 0 && (
          <span className="text-xs text-muted-foreground italic">{label || team.name}</span>
        )}
      </div>

      {/* Progress / winner */}
      <div className="flex items-center gap-2 shrink-0">
        {isWinner && <Trophy className="h-4 w-4 text-green-500" />}
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {completedCount}/{totalCells}
        </span>
      </div>
    </div>
  )
}
