import type { GameContext, ActionResult } from './types'

export async function handleSwitchTeam(
  ctx: GameContext,
  targetTeamIndex: number,
): Promise<ActionResult> {
  const { user, payload, gameId, collection, game } = ctx

  if (targetTeamIndex !== 0 && targetTeamIndex !== 1) {
    return { error: 'Invalid team index', status: 400 }
  }

  if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
    return { error: 'Can only switch teams in the lobby', status: 400 }
  }

  if (game.mode !== 'team') {
    return { error: 'Can only switch teams in team mode', status: 400 }
  }

  // Find which team the user is currently on
  let currentTeamIndex = -1
  for (let i = 0; i < game.teams.length; i++) {
    const found = game.teams[i].players?.some((p) => {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      return pid === user.id
    })
    if (found) {
      currentTeamIndex = i
      break
    }
  }

  if (currentTeamIndex === -1) {
    return { error: 'You are not in this game', status: 400 }
  }

  if (currentTeamIndex === targetTeamIndex) {
    return { error: 'You are already on this team', status: 400 }
  }

  const targetTeam = game.teams[targetTeamIndex]
  if ((targetTeam.players ?? []).length >= 2) {
    return { error: 'Target team is full', status: 400 }
  }

  // Remove user from current team
  game.teams[currentTeamIndex].players = (game.teams[currentTeamIndex].players ?? []).filter(
    (p) => {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      return pid !== user.id
    },
  )

  // Add user to target team
  if (!targetTeam.players) targetTeam.players = []
  targetTeam.players.push({ user: user.id, isReady: false })

  // Remove from target team's pendingInvites if present
  targetTeam.pendingInvites = (targetTeam.pendingInvites ?? []).filter((p) => {
    const pid = typeof p.user === 'string' ? p.user : p.user.id
    return pid !== user.id
  })

  // If game was 'ready', reset to 'waiting'
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

  return { success: true, data: { success: true, teamIndex: targetTeamIndex } }
}
