import type { Payload } from 'payload'
import type { Bingo, Race } from '@/payload-types'

export type ResolvedGame =
  | { collection: 'bingo'; game: Bingo }
  | { collection: 'races'; game: Race }

export async function resolveGameById(
  payload: Payload,
  gameId: string,
  depth: number = 2,
): Promise<ResolvedGame | null> {
  const [bingo, race] = await Promise.allSettled([
    payload.findByID({ collection: 'bingo', id: gameId, depth }),
    payload.findByID({ collection: 'races', id: gameId, depth }),
  ])
  if (bingo.status === 'fulfilled' && bingo.value)
    return { collection: 'bingo', game: bingo.value }
  if (race.status === 'fulfilled' && race.value)
    return { collection: 'races', game: race.value }
  return null
}
