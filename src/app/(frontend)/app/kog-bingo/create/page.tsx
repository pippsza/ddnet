'use client'

import { BingoCreateRedirect } from '@/components/game/BingoCreateRedirect'
import { KOG_BINGO_CONFIG } from '@/lib/game-page-config'

export default function CreateKogBingoPage() {
  return <BingoCreateRedirect config={KOG_BINGO_CONFIG} />
}
