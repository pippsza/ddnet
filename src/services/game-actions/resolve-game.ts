import type { Payload } from 'payload'
import type { Bingo, Race, KogBingo, KogRace } from '@/payload-types'

export type ResolvedGame =
  | { collection: 'bingo'; game: Bingo }
  | { collection: 'races'; game: Race }
  | { collection: 'kog-bingo'; game: KogBingo }
  | { collection: 'kog-races'; game: KogRace }

export async function resolveGameById(
  payload: Payload,
  gameId: string,
  depth: number = 2,
): Promise<ResolvedGame | null> {
  const [bingo, race, kogBingo, kogRace] = await Promise.allSettled([
    payload.findByID({ collection: 'bingo', id: gameId, depth }),
    payload.findByID({ collection: 'races', id: gameId, depth }),
    payload.findByID({ collection: 'kog-bingo', id: gameId, depth }),
    payload.findByID({ collection: 'kog-races', id: gameId, depth }),
  ])
  if (bingo.status === 'fulfilled' && bingo.value)
    return { collection: 'bingo', game: bingo.value }
  if (race.status === 'fulfilled' && race.value)
    return { collection: 'races', game: race.value }
  if (kogBingo.status === 'fulfilled' && kogBingo.value)
    return { collection: 'kog-bingo', game: kogBingo.value }
  if (kogRace.status === 'fulfilled' && kogRace.value)
    return { collection: 'kog-races', game: kogRace.value }
  return null
}
