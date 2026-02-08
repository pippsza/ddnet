'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { cn } from '@/lib/utils'

interface PlayerCardProps {
  name: string
  points?: number
  rank?: number
  isVerified?: boolean
  isOnline?: boolean
  serverName?: string
  skin?: { name: string; colorBody: number; colorFeet: number }
  variant?: 'registered' | 'ddnet'
  compact?: boolean
  showAddFriend?: boolean
  onAddFriend?: () => void
  className?: string
}

export function PlayerCard({
  name,
  points,
  rank,
  isVerified,
  isOnline,
  serverName,
  skin,
  variant = 'ddnet',
  compact = false,
  showAddFriend,
  onAddFriend,
  className,
}: PlayerCardProps) {
  const skinUrl = skin?.name ? getDDNetSkinUrl(skin.name) : undefined

  const content = (
    <Card className={cn(
      'group transition-all hover:shadow-md hover:border-primary/30',
      variant === 'registered' && 'border-l-2 border-l-primary/50',
      className,
    )}>
      <CardContent className={cn('flex items-center gap-3', compact ? 'p-3' : 'p-4')}>
        <div className="relative flex-shrink-0">
          <TeeAvatarWithFallback
            skinUrl={skinUrl}
            bodyColor={skin?.colorBody}
            feetColor={skin?.colorFeet}
            size={compact ? 'sm' : 'md'}
            useCustomColors={!!(skin?.colorBody || skin?.colorFeet)}
          />
          {isOnline !== undefined && (
            <span className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card',
              isOnline ? 'bg-green-500' : 'bg-gray-400',
            )} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate text-sm group-hover:text-primary transition-colors">
              {name}
            </span>
            {isVerified && <StatusBadge status="verified" className="text-[10px] px-1.5 py-0" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            {points !== undefined && <span>{points.toLocaleString()} pts</span>}
            {rank !== undefined && <span className="opacity-60">#{rank}</span>}
            {isOnline && serverName && (
              <span className="text-green-600 dark:text-green-400 truncate">{serverName}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {variant === 'registered' && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Member</span>
          )}
          {showAddFriend && onAddFriend && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddFriend() }}
              className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 transition-colors"
            >
              Add
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Link href={`/app/players/${encodeURIComponent(name)}`} className="block">
      {content}
    </Link>
  )
}

interface PlayerCardCompactProps {
  name: string
  points?: number
  skin?: { name: string; colorBody: number; colorFeet: number }
  roundsWon?: number
  isReady?: boolean
  isWinner?: boolean
  color?: string
  className?: string
}

export function PlayerCardCompact({
  name,
  points,
  skin,
  roundsWon,
  isReady,
  isWinner,
  color,
  className,
}: PlayerCardCompactProps) {
  const skinUrl = skin?.name ? getDDNetSkinUrl(skin.name) : undefined

  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg border bg-card',
      isWinner && 'ring-2 ring-green-500/50 border-green-500/30',
      color && `border-l-2`,
      className,
    )} style={color ? { borderLeftColor: color } : undefined}>
      <TeeAvatarWithFallback
        skinUrl={skinUrl}
        bodyColor={skin?.colorBody}
        feetColor={skin?.colorFeet}
        size="sm"
        useCustomColors={!!(skin?.colorBody || skin?.colorFeet)}
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{name}</span>
        {points !== undefined && (
          <span className="text-xs text-muted-foreground">{points.toLocaleString()} pts</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {roundsWon !== undefined && (
          <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded">{roundsWon}W</span>
        )}
        {isReady !== undefined && (
          <span className={cn(
            'w-2 h-2 rounded-full',
            isReady ? 'bg-green-500' : 'bg-gray-400',
          )} />
        )}
        {isWinner && (
          <span className="text-xs font-bold text-green-600 dark:text-green-400">WIN</span>
        )}
      </div>
    </div>
  )
}
