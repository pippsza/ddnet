'use client'

import { BingoCreateRedirect } from '@/components/game/BingoCreateRedirect'
import { DDNET_BINGO_CONFIG } from '@/lib/game-page-config'

export default function CreateBingoPage() {
  return <BingoCreateRedirect config={DDNET_BINGO_CONFIG} />
}
