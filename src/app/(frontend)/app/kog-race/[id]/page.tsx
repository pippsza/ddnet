'use client'

import { RaceGamePageContent } from '@/components/game/RaceGamePageContent'
import { KOG_RACE_CONFIG } from '@/lib/game-page-config'

export default function KogRaceGamePage({ params }: { params: Promise<{ id: string }> }) {
  return <RaceGamePageContent params={params} config={KOG_RACE_CONFIG} />
}
