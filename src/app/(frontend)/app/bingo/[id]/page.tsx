'use client'

import { BingoGamePageContent } from '@/components/game/BingoGamePageContent'
import { DDNET_BINGO_CONFIG } from '@/lib/game-page-config'

export default function BingoGamePage({ params }: { params: Promise<{ id: string }> }) {
  return <BingoGamePageContent params={params} config={DDNET_BINGO_CONFIG} />
}
