'use client'

import { ReactNode } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export interface OnlineStatus {
  platformOnline: boolean
  inGameOnline: boolean
  serverName?: string
  mapName?: string
}

interface OnlineStatusIndicatorProps {
  status?: OnlineStatus | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  children: ReactNode
  className?: string
}

const INDICATOR_SIZES = {
  xs: { ring: 2, dot: 8 },
  sm: { ring: 2, dot: 10 },
  md: { ring: 2.5, dot: 12 },
  lg: { ring: 3, dot: 14 },
  xl: { ring: 3, dot: 16 },
  '2xl': { ring: 4, dot: 18 },
} as const

export function OnlineStatusIndicator({
  status,
  size = 'md',
  children,
  className,
}: OnlineStatusIndicatorProps) {
  const { ring, dot } = INDICATOR_SIZES[size]
  const hasPlatform = status?.platformOnline ?? false
  const hasInGame = status?.inGameOnline ?? false

  // No status data — render children bare
  if (!status || (!hasPlatform && !hasInGame)) {
    return <div className={cn('relative inline-block', className)}>{children}</div>
  }

  const tooltipLines: string[] = []
  if (hasPlatform && hasInGame) {
    tooltipLines.push('Online on platform & playing in-game')
    if (status.serverName) tooltipLines.push(`Server: ${status.serverName}`)
    if (status.mapName) tooltipLines.push(`Map: ${status.mapName}`)
  } else if (hasPlatform) {
    tooltipLines.push('Online on platform')
  } else if (hasInGame) {
    tooltipLines.push('Playing on DDNet server')
    if (status.serverName) tooltipLines.push(`Server: ${status.serverName}`)
    if (status.mapName) tooltipLines.push(`Map: ${status.mapName}`)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('relative inline-block', className)}>
          {children}

          {/* Dot = in-game status, ring around dot = platform online */}
          <span
            className={cn(
              'absolute rounded-full border-2 border-card',
              hasInGame ? 'bg-green-500' : 'bg-muted-foreground/40',
            )}
            style={{
              width: dot,
              height: dot,
              bottom: -1,
              right: -1,
              boxShadow: hasPlatform ? `0 0 0 ${ring}px rgb(34 197 94)` : undefined,
            }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        <div className="space-y-0.5">
          {tooltipLines.map((line, i) => (
            <p key={i} className="text-xs">{line}</p>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
