import type { GameContext, ActionResult } from './types'
import { resolveUserId } from './helpers'

export async function handleLeave(ctx: GameContext): Promise<ActionResult> {
  const { user, payload, gameId, collection, game } = ctx

  if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
    return { error: 'Cannot leave after game has started', status: 400 }
  }

  const creatorId = resolveUserId(game.createdBy)
  if (user.id === creatorId) {
    return { error: 'Creator cannot leave. Use cancel instead.', status: 400 }
  }

  const teams = JSON.parse(JSON.stringify(game.teams))
  let found = false
  for (const team of teams) {
    const before = (team.players ?? []).length
    team.players = (team.players ?? []).filter((p: any) => {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      return pid !== user.id
    })
    if ((team.players ?? []).length < before) {
      found = true
      break
    }
  }

  if (!found) {
    return { error: 'You are not in this game', status: 400 }
  }

  await payload.update({
    collection,
    id: gameId,
    data: { teams },
  })

  await payload.update({
    collection: 'users',
    id: user.id,
    data: { activeGame: null as any },
  })

  return { success: true, data: { success: true } }
}
