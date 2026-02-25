import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface JoinGameRequest {
  teamIndex?: number
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!user.isSystemVerified) {
      return NextResponse.json({ error: 'You must verify your nickname first' }, { status: 400 })
    }

    const { gameId } = await params
    const body: JoinGameRequest = await req.json()

    const game = await payload.findByID({ collection: 'races', id: gameId, depth: 2 })

    if (!game) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Race is not accepting new players' }, { status: 400 })
    }

    // Check if user already in game
    for (const team of game.teams) {
      if (team.players?.some((p) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid === user.id
      })) {
        return NextResponse.json({ error: 'You are already in this race' }, { status: 400 })
      }
    }

    // Determine target team
    let targetTeamIndex: number
    if (game.mode === 'solo') {
      targetTeamIndex = 0
    } else if (body.teamIndex !== undefined) {
      targetTeamIndex = body.teamIndex
    } else {
      targetTeamIndex = (game.teams[0].players ?? []).length <= (game.teams[1].players ?? []).length ? 0 : 1
    }

    const targetTeam = game.teams[targetTeamIndex]
    if ((targetTeam.players ?? []).length >= 2) {
      return NextResponse.json({ error: 'This team is full' }, { status: 400 })
    }

    if (!targetTeam.players) targetTeam.players = []
    targetTeam.players.push({ user: user.id, isReady: false })

    // Remove from pendingInvites if present
    targetTeam.pendingInvites = (targetTeam.pendingInvites ?? []).filter((p) => {
      const pid = typeof p.user === 'string' ? p.user : p.user.id
      return pid !== user.id
    })

    // Reset to waiting if was ready
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

    await payload.update({ collection: 'races', id: gameId, data: updateData })

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { activeGame: { relationTo: 'races', value: gameId } },
    })

    return NextResponse.json({
      success: true,
      teamIndex: targetTeamIndex,
      message: `Joined ${targetTeam.teamName}`,
    })
  } catch (error: any) {
    console.error('[API] Error joining race:', error)
    return NextResponse.json({ error: error.message || 'Failed to join race' }, { status: 500 })
  }
}
