import type { GameContext, ActionResult } from './types'
import { extractPlayerIds, finalizeGameForPlayers } from './helpers'

export async function handleSurrender(ctx: GameContext): Promise<ActionResult> {
  const { user, payload, gameId, collection, game } = ctx

  if (game.gameStatus !== 'in_progress') {
    return { error: 'Can only surrender an in-progress game', status: 400 }
  }

  let userTeamIndex = -1
  for (let i = 0; i < game.teams.length; i++) {
    const found = game.teams[i].players?.some((p) => {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      return pid === user.id
    })
    if (found) {
      userTeamIndex = i
      break
    }
  }

  if (userTeamIndex === -1) {
    return { error: 'You are not in this game', status: 403 }
  }

  const isSolo = game.mode === 'solo'
  let winnerTeamIndex: number | null = null

  if (!isSolo) {
    winnerTeamIndex = userTeamIndex === 0 ? 1 : 0
  }

  const updatedTeams = game.teams.map((team, idx) => ({
    ...team,
    teamStatus: (isSolo ? 'loser' : idx === winnerTeamIndex ? 'winner' : 'loser') as
      | 'winner'
      | 'loser',
  }))

  const now = new Date().toISOString()
  const startTime = game.startedAt ? new Date(game.startedAt).getTime() : Date.now()
  const duration = Math.floor((Date.now() - startTime) / 1000)

  const updateData: Record<string, any> = {
    gameStatus: isSolo ? 'cancelled' : 'completed',
    teams: updatedTeams,
    winnerTeam: winnerTeamIndex,
    completedAt: now,
    duration,
  }

  if (collection === 'races' || collection === 'kog-races') {
    updateData.surrenderedByTeam = userTeamIndex
  }

  await payload.update({
    collection,
    id: gameId,
    data: updateData,
  })

  const playerIds = extractPlayerIds(game.teams)
  await finalizeGameForPlayers(payload, playerIds, collection, gameId)

  return { success: true, data: { success: true } }
}
