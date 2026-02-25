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

    const game = await payload.findByID({ collection: 'races', id: gameId, depth: 1 })

    if (!game) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Race is not accepting invites' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'You are not in this race' }, { status: 403 })
    }

    if (body.teamIndex !== inviterTeamIndex && !isCreator) {
      return NextResponse.json({ error: 'You can only invite to your own team' }, { status: 400 })
    }

    const targetTeam = game.teams[body.teamIndex]
    const currentCount = (targetTeam.players ?? []).length + (targetTeam.pendingInvites ?? []).length
    if (currentCount >= 2) {
      return NextResponse.json({ error: 'Team is full' }, { status: 400 })
    }

    for (const team of game.teams) {
      if (team.players?.some((p) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid === body.playerId
      })) {
        return NextResponse.json({ error: 'Player is already in this race' }, { status: 400 })
      }
    }

    const alreadyInvited = targetTeam.pendingInvites?.some((p) => {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      return pid === body.playerId
    })
    if (alreadyInvited) {
      return NextResponse.json({ error: 'Player is already invited' }, { status: 400 })
    }

    const invitedPlayer = await payload.findByID({ collection: 'users', id: body.playerId, depth: 0 })
    if (invitedPlayer?.activeGame) {
      return NextResponse.json({ error: 'Player is already in another game' }, { status: 400 })
    }

    await payload.create({
      collection: 'notifications',
      data: {
        recipient: body.playerId,
        type: 'game_invite',
        title: 'Race Invite',
        message: `${user.ingameNick || user.username} invited you to ${game.title}`,
        actionUrl: `/app/race/${gameId}?team=${body.teamIndex}`,
        relatedGame: { relationTo: 'races', value: gameId },
        relatedUser: user.id,
        metadata: {
          gameType: 'race',
          inviteCode: game.inviteCode,
          teamIndex: body.teamIndex,
        },
      },
    })

    const teams = JSON.parse(JSON.stringify(game.teams))
    if (!teams[body.teamIndex].pendingInvites) teams[body.teamIndex].pendingInvites = []
    teams[body.teamIndex].pendingInvites.push({
      user: body.playerId,
      invitedAt: new Date().toISOString(),
    })

    await payload.update({ collection: 'races', id: gameId, data: { teams } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error sending race invite:', error)
    return NextResponse.json({ error: error.message || 'Failed to send invite' }, { status: 500 })
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

    const game = await payload.findByID({ collection: 'races', id: gameId, depth: 1 })

    if (!game) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Race is not in waiting state' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'You are not in this race' }, { status: 403 })
    }

    if (body.teamIndex !== userTeamIndex && !isCreator) {
      return NextResponse.json({ error: 'You can only cancel invites on your own team' }, { status: 400 })
    }

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

    await payload.update({ collection: 'races', id: gameId, data: { teams } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error cancelling race invite:', error)
    return NextResponse.json({ error: error.message || 'Failed to cancel invite' }, { status: 500 })
  }
}
