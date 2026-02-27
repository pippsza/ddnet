'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge, RoleBadge } from '@/components/ui/status-badge'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { cn } from '@/lib/utils'

interface PlayerCardProps {
  name: string
  /** Link target. undefined = auto (/app/players/${name}), false = no link */
  href?: string | false
  points?: number
  rank?: number
  role?: string | { name?: string; displayName: string; badgeColor: string; textColor: string } | null
  isVerified?: boolean
  skin?: { name?: string; colorBody?: number; colorFeet?: number }
  // Online status
  platformOnline?: boolean
  inGameOnline?: boolean
  afk?: boolean
  serverName?: string
  mapName?: string
  // Appearance
  size?: 'sm' | 'md'
  variant?: 'default' | 'registered' | 'ddnet'
  showMapBackground?: boolean
  // Slots
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PlayerCard({
  name,
  href,
  points,
  rank,
  role,
  isVerified,
  skin,
  platformOnline,
  inGameOnline,
  afk,
  serverName,
  mapName,
  size = 'md',
  variant = 'default',
  showMapBackground = false,
  subtitle,
  actions,
  className,
}: PlayerCardProps) {
  const skinUrl = skin?.name ? getDDNetSkinUrl(skin.name) : undefined

  const onlineStatus =
    platformOnline !== undefined || inGameOnline !== undefined
      ? {
          platformOnline: platformOnline ?? false,
          inGameOnline: inGameOnline ?? false,
          afk: afk ?? false,
          serverName,
          mapName,
        }
      : null

  const mapThumbnailUrl =
    showMapBackground && inGameOnline && mapName
      ? `https://ddnet.org/ranks/maps/${mapName.replace(/ /g, '_')}.png`
      : null

  const card = (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/30',
        variant === 'registered' && 'border-l-2 border-l-primary/50',
        className,
      )}
    >
      {mapThumbnailUrl && (
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapThumbnailUrl}
            alt=""
            className="w-full h-full object-cover blur-[2px] scale-110 opacity-25"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card/90 via-card/80 to-card/70" />
        </div>
      )}
      <CardContent
        className={cn(
          'relative z-10 flex items-center gap-3',
          size === 'sm' ? 'p-3' : 'p-4',
        )}
      >
        <OnlineStatusIndicator
          status={onlineStatus}
          size={size}
          className="shrink-0"
        >
          <TeeAvatarWithFallback
            skinUrl={skinUrl}
            bodyColor={skin?.colorBody}
            feetColor={skin?.colorFeet}
            size={size}
            useCustomColors={!!(skin?.colorBody || skin?.colorFeet)}
          />
        </OnlineStatusIndicator>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold truncate text-sm group-hover:text-primary transition-colors">
              {name}
            </span>
            {isVerified && (
              <StatusBadge
                status="verified"
                className="text-[10px] px-1.5 py-0"
              />
            )}
            {role && (typeof role === 'object' || role !== 'player') ? (
              <RoleBadge
                role={role}
                className="text-[10px] px-1.5 py-0 shrink-0"
              />
            ) : variant === 'registered' ? (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                Member
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <div className="mt-0.5">{subtitle}</div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 text-xs text-muted-foreground mt-0.5">
              {points !== undefined && (
                <span>{points.toLocaleString()} pts</span>
              )}
              {rank !== undefined && (
                <span className="opacity-60">#{rank}</span>
              )}
              {inGameOnline && serverName && (
                <span className="text-green-600 dark:text-green-400 truncate">
                  {serverName}
                </span>
              )}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </CardContent>
    </Card>
  )

  if (href === false) return card

  const resolvedHref = href ?? `/app/players/${encodeURIComponent(name)}`

  return (
    <Link href={resolvedHref} className="block">
      {card}
    </Link>
  )
}

// ── Compact variant for game contexts (bingo, race) ──

interface PlayerCardCompactProps {
  name: string
  points?: number
  skin?: { name?: string; colorBody?: number; colorFeet?: number }
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
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border bg-card',
        isWinner && 'ring-2 ring-green-500/50 border-green-500/30',
        color && 'border-l-2',
        className,
      )}
      style={color ? { borderLeftColor: color } : undefined}
    >
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
          <span className="text-xs text-muted-foreground">
            {points.toLocaleString()} pts
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {roundsWon !== undefined && (
          <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded">
            {roundsWon}W
          </span>
        )}
        {isReady !== undefined && (
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isReady ? 'bg-green-500' : 'bg-gray-400',
            )}
          />
        )}
        {isWinner && (
          <span className="text-xs font-bold text-green-600 dark:text-green-400">
            WIN
          </span>
        )}
      </div>
    </div>
  )
}
