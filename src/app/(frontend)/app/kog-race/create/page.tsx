'use client'

import { RaceCreateRedirect } from '@/components/game/RaceCreateRedirect'
import { KOG_RACE_CONFIG } from '@/lib/game-page-config'

export default function CreateKogRacePage() {
  return <RaceCreateRedirect config={KOG_RACE_CONFIG} />
}
