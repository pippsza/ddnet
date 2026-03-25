'use client'

import { Suspense } from 'react'
import { LobbyPageSkeleton } from '@/components/ui/page-skeleton'
import { BingoLobbyContent } from '@/components/game/BingoLobbyContent'
import { KOG_BINGO_CONFIG } from '@/lib/game-page-config'

export default function KogBingoLobbyPage() {
  return (
    <Suspense fallback={<LobbyPageSkeleton />}>
      <BingoLobbyContent config={KOG_BINGO_CONFIG} />
    </Suspense>
  )
}
