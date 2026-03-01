import { NextRequest, NextResponse } from 'next/server'
import { authenticateClientToken } from '@/lib/client-auth'

/**
 * POST /api/client/bingo/join — Join a bingo game by invite code.
 * Header: Authorization: Bearer <clientToken>
 * Body: { inviteCode: "ABCD1234", teamIndex?: 0 | 1 }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateClientToken(req)
    if (auth instanceof NextResponse) return auth
    const { user, payload } = auth

    const body = await req.json()
    const { inviteCode, teamIndex } = body as { inviteCode?: string; teamIndex?: number }

    if (!inviteCode) {
      return NextResponse.json({ error: 'Missing invite code' }, { status: 400 })
    }

    // Find game by invite code
    const { docs: games } = await payload.find({
      collection: 'bingo',
      where: { inviteCode: { equals: inviteCode } },
      limit: 1,
    })

    if (games.length === 0) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    const game = games[0]

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Game is not accepting new players' }, { status: 400 })
    }

    // Check if user already in game
    for (const team of game.teams) {
      if (
        team.players?.some((p) => {
          const playerId = typeof p.user === 'string' ? p.user : p.user.id
          return playerId === user.id
        })
      ) {
        return NextResponse.json({ error: 'You are already in this game' }, { status: 400 })
      }
    }

    // Determine which team to join
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
      return NextResponse.json({ error: 'This team is full' }, { status: 400 })
    }

    // Add player to team
    if (!targetTeam.players) targetTeam.players = []
    targetTeam.players.push({ user: user.id, isReady: false })

    // Remove from pendingInvites if they were invited
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

    await payload.update({ collection: 'bingo', id: game.id, data: updateData })

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { activeGame: { relationTo: 'bingo', value: game.id } },
    })

    return NextResponse.json({
      success: true,
      gameId: game.id,
      teamIndex: targetTeamIndex,
      message: `Joined ${game.title}`,
    })
  } catch (error: any) {
    console.error('[API] Error joining bingo (client):', error)
    return NextResponse.json(
      { error: error.message || 'Failed to join game' },
      { status: 500 },
    )
  }
}
