'use client'

import { RaceCreateRedirect } from '@/components/game/RaceCreateRedirect'
import { DDNET_RACE_CONFIG } from '@/lib/game-page-config'

export default function CreateRacePage() {
  return <RaceCreateRedirect config={DDNET_RACE_CONFIG} />
}
