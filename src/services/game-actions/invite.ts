import type { GameContext, ActionResult } from './types'
import { findPlayerInGame, resolveUserId } from './helpers'

export async function handleInvite(
  ctx: GameContext,
  body: { playerId?: string; playerName?: string; teamIndex: number },
): Promise<ActionResult> {
  const { user, payload, gameId, collection, game } = ctx

  if (body.teamIndex === undefined) {
    return { error: 'Missing teamIndex', status: 400 }
  }

  // Resolve playerId from playerName if not provided directly
  if (!body.playerId && body.playerName) {
    const found = await payload.find({
      collection: 'users',
      where: { ingameNick: { equals: body.playerName } },
      depth: 0,
      limit: 1,
    })
    if (found.docs.length === 0) {
      return { error: 'Player not found', status: 404 }
    }
    body.playerId = found.docs[0].id
  }

  if (!body.playerId) {
    return { error: 'Missing playerId or playerName', status: 400 }
  }

  if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
    return { error: 'Game is not accepting invites', status: 400 }
  }

  const creatorId = resolveUserId(game.createdBy)
  const isCreator = user.id === creatorId

  const inviterPos = findPlayerInGame(game.teams, user.id)
  if (inviterPos === null) {
    return { error: 'You are not in this game', status: 403 }
  }

  // Creator can invite to any team, others only to their own
  if (body.teamIndex !== inviterPos.teamIndex && !isCreator) {
    return { error: 'You can only invite to your own team', status: 400 }
  }

  // Check team has space (players + pending invites)
  const targetTeam = game.teams[body.teamIndex]
  const currentCount = (targetTeam.players ?? []).length + (targetTeam.pendingInvites ?? []).length
  if (currentCount >= 2) {
    return { error: 'Team is full', status: 400 }
  }

  // Check invited player is not already in the game
  for (const team of game.teams) {
    const alreadyIn = team.players?.some((p) => {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      return pid === body.playerId
    })
    if (alreadyIn) {
      return { error: 'Player is already in this game', status: 400 }
    }
  }

  // Check player is not already invited
  const alreadyInvited = targetTeam.pendingInvites?.some((p) => {
    const pid = typeof p.user === 'string' ? p.user : p.user.id
    return pid === body.playerId
  })
  if (alreadyInvited) {
    return { error: 'Player is already invited', status: 400 }
  }

  // Check if invited player already has an active game
  const invitedPlayer = await payload.findByID({ collection: 'users', id: body.playerId, depth: 0 })
  if (invitedPlayer?.activeGame) {
    return { error: 'Player is already in another game', status: 400 }
  }

  // Derive game type info for notifications
  const gameType = collection === 'bingo' ? 'bingo' : 'race'
  const pageRoute = collection === 'bingo' ? 'bingo' : 'race'
  const notifTitle = collection === 'bingo' ? 'Game Invite' : 'Race Invite'

  // Send invite notification
  await payload.create({
    collection: 'notifications',
    data: {
      recipient: body.playerId,
      type: 'game_invite',
      title: notifTitle,
      message: `${user.ingameNick || user.username} invited you to ${game.title}`,
      actionUrl: `/app/${pageRoute}/${gameId}?team=${body.teamIndex}`,
      relatedGame: { relationTo: collection, value: gameId },
      relatedUser: user.id,
      metadata: {
        gameType,
        inviteCode: game.inviteCode,
        teamIndex: body.teamIndex,
      },
    },
  })

  // Add to pendingInvites on the target team
  const teams = JSON.parse(JSON.stringify(game.teams))
  if (!teams[body.teamIndex].pendingInvites) teams[body.teamIndex].pendingInvites = []
  teams[body.teamIndex].pendingInvites.push({
    user: body.playerId,
    invitedAt: new Date().toISOString(),
  })

  await payload.update({ collection, id: gameId, data: { teams } })

  return { success: true, data: { success: true } }
}

export async function handleCancelInvite(
  ctx: GameContext,
  body: { playerId: string; teamIndex: number },
): Promise<ActionResult> {
  const { user, payload, gameId, collection, game } = ctx

  if (!body.playerId || body.teamIndex === undefined) {
    return { error: 'Missing playerId or teamIndex', status: 400 }
  }

  if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
    return { error: 'Game is not in waiting state', status: 400 }
  }

  const creatorId = resolveUserId(game.createdBy)
  const isCreator = user.id === creatorId

  const userPos = findPlayerInGame(game.teams, user.id)
  if (userPos === null) {
    return { error: 'You are not in this game', status: 403 }
  }

  // Creator can cancel any invite, others only on their own team
  if (body.teamIndex !== userPos.teamIndex && !isCreator) {
    return { error: 'You can only cancel invites on your own team', status: 400 }
  }

  // Remove from pendingInvites
  const teams = JSON.parse(JSON.stringify(game.teams))
  const targetTeam = teams[body.teamIndex]
  const before = (targetTeam.pendingInvites ?? []).length
  targetTeam.pendingInvites = (targetTeam.pendingInvites ?? []).filter((p: any) => {
    const pid = typeof p.user === 'string' ? p.user : p.user.id
    return pid !== body.playerId
  })

  if ((targetTeam.pendingInvites ?? []).length === before) {
    return { error: 'Invite not found', status: 404 }
  }

  await payload.update({ collection, id: gameId, data: { teams } })

  return { success: true, data: { success: true } }
}
