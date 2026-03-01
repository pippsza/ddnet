'use client'

import { cn } from '@/lib/utils'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from './TeeAvatar'

interface PeekingTeeProps {
  skinName: string
  bodyColor?: number
  feetColor?: number
  side: 'left' | 'right'
  verticalPosition?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function PeekingTee({
  skinName,
  bodyColor,
  feetColor,
  side,
  verticalPosition = '50%',
  size = 'lg',
  className,
}: PeekingTeeProps) {
  return (
    <div
      className={cn(
        'absolute pointer-events-none hidden lg:block opacity-60',
        side === 'left' ? 'left-0' : 'right-0',
        className,
      )}
      style={{ top: verticalPosition, transform: 'translateY(-50%)' }}
    >
      <div
        className={cn(
          side === 'left' ? '-translate-x-[45%]' : 'translate-x-[45%]',
        )}
      >
        <TeeAvatarWithFallback
          skinUrl={getDDNetSkinUrl(skinName)}
          bodyColor={bodyColor}
          feetColor={feetColor}
          useCustomColors={!!(bodyColor || feetColor)}
          size={size}
          lookAtCursor
          mirrored={side === 'right'}
          showPlaceholder={false}
        />
      </div>
    </div>
  )
}
