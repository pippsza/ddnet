import type { GameContext, ActionResult } from './types'
import { resolveUserId } from './helpers'

export async function handleStartValidation(ctx: GameContext): Promise<ActionResult> {
  const { user, game } = ctx

  const creatorId = resolveUserId(game.createdBy)
  if (creatorId !== user.id) {
    return { error: 'Only game creator can start the game', status: 403 }
  }

  if (game.gameStatus !== 'ready' && game.gameStatus !== 'waiting') {
    return { error: 'Game cannot be started in its current state', status: 400 }
  }

  for (const team of game.teams) {
    if (!team.players || team.players.length === 0) {
      return { error: `${team.teamName} has no players`, status: 400 }
    }
  }

  for (const team of game.teams) {
    for (const p of team.players ?? []) {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      if (pid !== user.id && !p.isReady) {
        return { error: 'Not all players are ready', status: 400 }
      }
    }
  }

  return { success: true }
}

export async function handleStartSimple(ctx: GameContext): Promise<ActionResult> {
  const validation = await handleStartValidation(ctx)
  if ('error' in validation) return validation

  const { payload, gameId, collection, game } = ctx

  for (const team of game.teams) {
    team.teamStatus = 'playing'
  }

  await payload.update({
    collection,
    id: gameId,
    data: {
      gameStatus: 'in_progress',
      startedAt: new Date().toISOString(),
      teams: game.teams,
    },
  })

  return {
    success: true,
    data: {
      success: true,
      message: 'Game started!',
      startedAt: new Date().toISOString(),
    },
  }
}
