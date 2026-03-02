import type { GameContext, ActionResult } from './types'
import { resolveUserId, extractPlayerIds, clearActiveGameForPlayers } from './helpers'

export async function handleCancel(ctx: GameContext): Promise<ActionResult> {
  const { user, payload, gameId, collection, game } = ctx

  const creatorId = resolveUserId(game.createdBy)
  if (creatorId !== user.id) {
    return { error: 'Only the creator can cancel this game', status: 403 }
  }

  if (game.gameStatus === 'completed' || game.gameStatus === 'cancelled') {
    return { error: 'Cannot cancel a finished game', status: 400 }
  }

  await payload.update({
    collection,
    id: gameId,
    data: {
      gameStatus: 'cancelled',
      isPublic: false,
      completedAt: new Date().toISOString(),
    },
  })

  const playerIds = extractPlayerIds(game.teams)
  await clearActiveGameForPlayers(payload, playerIds)

  return { success: true, data: { success: true } }
}
