import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import type { GameCollection, GameDocument } from './types'

export function resolveUserId(userField: string | User): string {
  return typeof userField === 'string' ? userField : userField.id
}

export function findPlayerInGame(
  teams: GameDocument['teams'],
  userId: string,
): { teamIndex: number; playerIndex: number } | null {
  for (let t = 0; t < teams.length; t++) {
    const pIndex = teams[t].players?.findIndex((p) => {
      return resolveUserId(p.user) === userId
    })
    if (pIndex !== undefined && pIndex >= 0) {
      return { teamIndex: t, playerIndex: pIndex }
    }
  }
  return null
}

export function extractPlayerIds(teams: GameDocument['teams']): string[] {
  return (teams ?? []).flatMap((team) =>
    (team.players ?? []).map((p) => resolveUserId(p.user)),
  )
}

export async function clearActiveGameForPlayers(
  payload: Payload,
  playerIds: string[],
): Promise<void> {
  for (const playerId of playerIds) {
    await payload.update({
      collection: 'users',
      id: playerId,
      data: { activeGame: null },
    })
  }
}

export async function checkAndClearStaleActiveGame(
  payload: Payload,
  user: User,
): Promise<{ hasActiveGame: boolean }> {
  if (!user.activeGame) return { hasActiveGame: false }

  const ref = user.activeGame as { relationTo: string; value: string | { id: string } }
  const refId = typeof ref.value === 'object' ? ref.value.id : ref.value
  let isStale = false
  try {
    const activeDoc = await payload.findByID({
      collection: ref.relationTo as 'bingo' | 'races' | 'kog-bingo' | 'kog-races',
      id: refId,
      depth: 0,
    })
    const status = (activeDoc as any)?.gameStatus
    if (!activeDoc || status === 'completed' || status === 'cancelled') {
      isStale = true
    }
  } catch {
    isStale = true
  }

  if (isStale) {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { activeGame: null },
    })
    return { hasActiveGame: false }
  }

  return { hasActiveGame: true }
}

export async function finalizeGameForPlayers(
  payload: Payload,
  playerIds: string[],
  collection: GameCollection,
  gameId: string,
): Promise<void> {
  const relationTo = collection
  for (const playerId of playerIds) {
    const playerUser = await payload.findByID({ collection: 'users', id: playerId })
    const existing = (playerUser.completedGames as any[]) || []
    await payload.update({
      collection: 'users',
      id: playerId,
      data: {
        activeGame: null,
        completedGames: [...existing, { relationTo, value: gameId }],
      },
    })
  }
}
