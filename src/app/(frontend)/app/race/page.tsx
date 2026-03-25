'use client'

import { Suspense } from 'react'
import { LobbyPageSkeleton } from '@/components/ui/page-skeleton'
import { RaceLobbyContent } from '@/components/game/RaceLobbyContent'
import { DDNET_RACE_CONFIG } from '@/lib/game-page-config'

export default function RaceLobbyPage() {
  return (
    <Suspense fallback={<LobbyPageSkeleton />}>
      <RaceLobbyContent config={DDNET_RACE_CONFIG} />
    </Suspense>
  )
}
