'use client'

import { Suspense } from 'react'
import { LobbyPageSkeleton } from '@/components/ui/page-skeleton'
import { BingoLobbyContent } from '@/components/game/BingoLobbyContent'
import { DDNET_BINGO_CONFIG } from '@/lib/game-page-config'

export default function BingoLobbyPage() {
  return (
    <Suspense fallback={<LobbyPageSkeleton />}>
      <BingoLobbyContent config={DDNET_BINGO_CONFIG} />
    </Suspense>
  )
}
