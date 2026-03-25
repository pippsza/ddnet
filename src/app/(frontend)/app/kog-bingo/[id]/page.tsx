'use client'

import { BingoGamePageContent } from '@/components/game/BingoGamePageContent'
import { KOG_BINGO_CONFIG } from '@/lib/game-page-config'

export default function KogBingoGamePage({ params }: { params: Promise<{ id: string }> }) {
  return <BingoGamePageContent params={params} config={KOG_BINGO_CONFIG} />
}
