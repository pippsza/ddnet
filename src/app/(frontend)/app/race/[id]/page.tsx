'use client'

import { RaceGamePageContent } from '@/components/game/RaceGamePageContent'
import { DDNET_RACE_CONFIG } from '@/lib/game-page-config'

export default function RaceGamePage({ params }: { params: Promise<{ id: string }> }) {
  return <RaceGamePageContent params={params} config={DDNET_RACE_CONFIG} />
}
