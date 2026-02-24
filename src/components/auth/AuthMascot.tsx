'use client'

import { cn } from '@/lib/utils'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import type { TeeEyeType } from '@/components/tee/TeeAvatar'

interface AuthMascotProps {
  passwordVisible?: boolean
  className?: string
}

export function AuthMascot({ passwordVisible = false, className }: AuthMascotProps) {
  const eyeType: TeeEyeType = passwordVisible ? 'blink' : 'default'
  return (
    <div className={cn('flex justify-center', className)}>
      <TeeAvatarWithFallback
        skinUrl={getDDNetSkinUrl('bot')}
        size="xl"
        useCustomColors={false}
        lookAtCursor
        eyeType={eyeType}
      />
    </div>
  )
}
