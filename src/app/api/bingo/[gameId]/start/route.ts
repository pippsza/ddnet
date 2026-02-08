import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Bingo, User } from '@/payload-types'

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

    // Check if game is ready
    if (game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Game is not ready to start' }, { status: 400 })
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
