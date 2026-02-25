import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const payload = await getPayload({ config })

    // Check authentication
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params

    // Get game
    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 2,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Check if user is the creator
    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Only game creator can start the game' }, { status: 403 })
    }

    // Allow starting from waiting or ready status
    if (game.gameStatus !== 'ready' && game.gameStatus !== 'waiting') {
      return NextResponse.json({ error: 'Game cannot be started in its current state' }, { status: 400 })
    }

    // Validate all teams have at least 1 player
    for (const team of game.teams) {
      if (!team.players || team.players.length === 0) {
        return NextResponse.json(
          { error: `${team.teamName} has no players` },
          { status: 400 },
        )
      }
    }

    // Validate all non-creator players are ready
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

    // Update game status to in_progress
    for (const team of game.teams) {
      team.teamStatus = 'playing'
    }

    await payload.update({
      collection: 'bingo',
      id: gameId,
      data: {
        gameStatus: 'in_progress',
        startedAt: new Date().toISOString(),
        teams: game.teams,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Game started!',
      startedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[API] Error starting game:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to start game',
      },
      { status: 500 },
    )
  }
}
