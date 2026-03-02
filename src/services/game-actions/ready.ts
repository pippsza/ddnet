import type { GameContext, ActionResult } from './types'
import { findPlayerInGame } from './helpers'

export async function handleReady(ctx: GameContext): Promise<ActionResult> {
  const { user, payload, gameId, collection, game } = ctx

  const found = findPlayerInGame(game.teams, user.id)
  if (!found) {
    return { error: 'You are not in this game', status: 400 }
  }

  const { teamIndex, playerIndex } = found
  const player = game.teams[teamIndex].players![playerIndex]
  player.isReady = !player.isReady

  let allReady = true
  let totalPlayers = 0
  for (const team of game.teams) {
    const players = team.players ?? []
    if (players.length === 0) {
      allReady = false
      break
    }
    totalPlayers += players.length
    for (const p of players) {
      if (!p.isReady) {
        allReady = false
        break
      }
    }
    if (!allReady) break
  }

  let newGameStatus = game.gameStatus
  if (allReady && totalPlayers >= 1) {
    let canStart = true
    for (const team of game.teams) {
      if (game.mode === 'team' && (team.players ?? []).length < 1) {
        canStart = false
        break
      }
      team.teamStatus = 'ready'
    }
    if (canStart) newGameStatus = 'ready'
  } else if (game.gameStatus === 'ready') {
    newGameStatus = 'waiting'
    for (const team of game.teams) {
      team.teamStatus = 'not_ready'
    }
  }

  await payload.update({
    collection,
    id: gameId,
    data: { teams: game.teams, gameStatus: newGameStatus },
  })

  return {
    success: true,
    data: {
      success: true,
      isReady: player.isReady,
      allReady,
      gameStatus: newGameStatus,
    },
  }
}
