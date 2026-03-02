import type { GameContext, ActionResult } from './types'

export async function handleJoin(
  ctx: GameContext,
  teamIndex?: number,
): Promise<ActionResult> {
  const { user, payload, gameId, collection, game } = ctx

  if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
    return { error: 'Game is not accepting new players', status: 400 }
  }

  for (const team of game.teams) {
    if (
      team.players?.some((p) => {
        const playerId = typeof p.user === 'string' ? p.user : p.user.id
        return playerId === user.id
      })
    ) {
      return { error: 'You are already in this game', status: 400 }
    }
  }

  let targetTeamIndex: number
  if (game.mode === 'solo') {
    targetTeamIndex = 0
  } else if (teamIndex !== undefined) {
    targetTeamIndex = teamIndex
  } else {
    targetTeamIndex =
      (game.teams[0].players ?? []).length <= (game.teams[1].players ?? []).length ? 0 : 1
  }

  const targetTeam = game.teams[targetTeamIndex]
  if ((targetTeam.players ?? []).length >= 2) {
    return { error: 'This team is full', status: 400 }
  }

  if (!targetTeam.players) targetTeam.players = []
  targetTeam.players.push({ user: user.id, isReady: false })

  targetTeam.pendingInvites = (targetTeam.pendingInvites ?? []).filter((p) => {
    const pid = typeof p.user === 'string' ? p.user : p.user.id
    return pid !== user.id
  })

  const updateData: Record<string, any> = { teams: game.teams }
  if (game.gameStatus === 'ready') {
    updateData.gameStatus = 'waiting'
    for (const t of game.teams) {
      for (const p of t.players ?? []) {
        ;(p as any).isReady = false
      }
      ;(t as any).teamStatus = 'not_ready'
    }
  }

  await payload.update({ collection, id: gameId, data: updateData })

  const relationTo = collection === 'bingo' ? 'bingo' : 'races'
  await payload.update({
    collection: 'users',
    id: user.id,
    data: { activeGame: { relationTo, value: gameId } },
  })

  return {
    success: true,
    data: {
      success: true,
      gameId,
      teamIndex: targetTeamIndex,
      message: `Joined ${game.title}`,
    },
  }
}
