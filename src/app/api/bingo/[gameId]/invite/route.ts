import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface InviteRequest {
  playerId: string
  teamIndex: number
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params
    const body: InviteRequest = await req.json()

    if (!body.playerId || body.teamIndex === undefined) {
      return NextResponse.json({ error: 'Missing playerId or teamIndex' }, { status: 400 })
    }

    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 1,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Game is not accepting invites' }, { status: 400 })
    }

    // Check inviter is in the game
    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    const isCreator = user.id === creatorId

    let inviterTeamIndex: number | null = null
    for (let i = 0; i < game.teams.length; i++) {
      const found = game.teams[i].players?.some((p) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid === user.id
      })
      if (found) {
        inviterTeamIndex = i
        break
      }
    }

    if (inviterTeamIndex === null) {
      return NextResponse.json({ error: 'You are not in this game' }, { status: 403 })
    }

    // Creator can invite to any team, others only to their own
    if (body.teamIndex !== inviterTeamIndex && !isCreator) {
      return NextResponse.json({ error: 'You can only invite to your own team' }, { status: 400 })
    }

    // Check team has space (players + pending invites)
    const targetTeam = game.teams[body.teamIndex]
    const currentCount = (targetTeam.players ?? []).length + (targetTeam.pendingInvites ?? []).length
    if (currentCount >= 2) {
      return NextResponse.json({ error: 'Team is full' }, { status: 400 })
    }

    // Check invited player is not already in the game
    for (const team of game.teams) {
      const alreadyIn = team.players?.some((p) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid === body.playerId
      })
      if (alreadyIn) {
        return NextResponse.json({ error: 'Player is already in this game' }, { status: 400 })
      }
    }

    // Check player is not already invited
    const alreadyInvited = targetTeam.pendingInvites?.some((p) => {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      return pid === body.playerId
    })
    if (alreadyInvited) {
      return NextResponse.json({ error: 'Player is already invited' }, { status: 400 })
    }

    // Check if invited player already has an active game
    const invitedPlayer = await payload.findByID({
      collection: 'users',
      id: body.playerId,
      depth: 0,
    })
    if (invitedPlayer?.activeGame) {
      return NextResponse.json({ error: 'Player is already in another game' }, { status: 400 })
    }

    // Send invite notification
    await payload.create({
      collection: 'notifications',
      data: {
        recipient: body.playerId,
        type: 'game_invite',
        title: 'Game Invite',
        message: `${user.ingameNick || user.username} invited you to ${game.title}`,
        actionUrl: `/app/bingo/${gameId}?team=${body.teamIndex}`,
        relatedGame: { relationTo: 'bingo', value: gameId },
        relatedUser: user.id,
        metadata: {
          gameType: 'bingo',
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

    await payload.update({
      collection: 'bingo',
      id: gameId,
      data: { teams },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error sending bingo invite:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invite' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params
    const body: { playerId: string; teamIndex: number } = await req.json()

    if (!body.playerId || body.teamIndex === undefined) {
      return NextResponse.json({ error: 'Missing playerId or teamIndex' }, { status: 400 })
    }

    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 1,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Game is not in waiting state' }, { status: 400 })
    }

    // Only creator or the inviter's team member can cancel
    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    const isCreator = user.id === creatorId

    let userTeamIndex: number | null = null
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

    if (userTeamIndex === null) {
      return NextResponse.json({ error: 'You are not in this game' }, { status: 403 })
    }

    // Creator can cancel any invite, others only on their own team
    if (body.teamIndex !== userTeamIndex && !isCreator) {
      return NextResponse.json({ error: 'You can only cancel invites on your own team' }, { status: 400 })
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
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    await payload.update({
      collection: 'bingo',
      id: gameId,
      data: { teams },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error cancelling bingo invite:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel invite' },
      { status: 500 },
    )
  }
}
