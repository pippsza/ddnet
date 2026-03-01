import { NextRequest, NextResponse } from 'next/server'
import { authenticateClientToken } from '@/lib/client-auth'

/**
 * POST /api/client/race/start — Start the race (creator only).
 * Header: Authorization: Bearer <clientToken>
 * Body: { gameId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateClientToken(req)
    if (auth instanceof NextResponse) return auth
    const { user, payload } = auth

    const { gameId } = (await req.json()) as { gameId?: string }
    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
    }

    const game = await payload.findByID({
      collection: 'races',
      id: gameId,
      depth: 2,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Only game creator can start the game' }, { status: 403 })
    }

    if (game.gameStatus !== 'ready' && game.gameStatus !== 'waiting') {
      return NextResponse.json({ error: 'Game cannot be started in its current state' }, { status: 400 })
    }

    for (const team of game.teams) {
      if (!team.players || team.players.length === 0) {
        return NextResponse.json(
          { error: `${team.teamName} has no players` },
          { status: 400 },
        )
      }
    }

    for (const team of game.teams) {
      for (const p of team.players ?? []) {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        if (pid !== user.id && !p.isReady) {
          return NextResponse.json(
            { error: 'Not all players are ready' },
            { status: 400 },
          )
        }
      }
    }

    for (const team of game.teams) {
      team.teamStatus = 'playing'
    }

    await payload.update({
      collection: 'races',
      id: gameId,
      data: {
        gameStatus: 'in_progress',
        startedAt: new Date().toISOString(),
        teams: game.teams,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Race started!',
      startedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[API] Client race start error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start race' },
      { status: 500 },
    )
  }
}
