import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

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

    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 1,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Only creator can cancel
    const creatorId =
      typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the creator can cancel this game' }, { status: 403 })
    }

    // Can only cancel games that are not completed
    if (game.gameStatus === 'completed' || game.gameStatus === 'cancelled') {
      return NextResponse.json({ error: 'Cannot cancel a completed game' }, { status: 400 })
    }

    await payload.update({
      collection: 'bingo',
      id: gameId,
      data: {
        gameStatus: 'cancelled',
        isPublic: false,
        completedAt: new Date().toISOString(),
      },
    })

    // Clear activeGame for all players in this game
    const playerIds = (game.teams ?? []).flatMap((team) =>
      (team.players ?? []).map((p) => (typeof p.user === 'string' ? p.user : p.user.id)),
    )
    for (const playerId of playerIds) {
      await payload.update({
        collection: 'users',
        id: playerId,
        data: { activeGame: null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error cancelling bingo game:', error)
    return NextResponse.json({ error: 'Failed to cancel game' }, { status: 500 })
  }
}
