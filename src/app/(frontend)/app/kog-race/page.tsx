'use client'

import { Suspense } from 'react'
import { LobbyPageSkeleton } from '@/components/ui/page-skeleton'
import { RaceLobbyContent } from '@/components/game/RaceLobbyContent'
import { KOG_RACE_CONFIG } from '@/lib/game-page-config'

export default function KogRaceLobbyPage() {
  return (
    <Suspense fallback={<LobbyPageSkeleton />}>
      <RaceLobbyContent config={KOG_RACE_CONFIG} />
    </Suspense>
  )
}
