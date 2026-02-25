import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params
    const game = await payload.findByID({ collection: 'races', id: gameId, depth: 1 })

    if (!game) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the creator can cancel this race' }, { status: 403 })
    }

    if (game.gameStatus === 'completed' || game.gameStatus === 'cancelled') {
      return NextResponse.json({ error: 'Cannot cancel a finished race' }, { status: 400 })
    }

    // Update DB first so the bot can read the final state before shutting down
    await payload.update({
      collection: 'races',
      id: gameId,
      data: {
        gameStatus: 'cancelled',
        isPublic: false,
        completedAt: new Date().toISOString(),
      },
    })

    // Clear activeGame for all players
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
  } catch (error: any) {
    console.error('[API] Error cancelling race:', error)
    return NextResponse.json({ error: error.message || 'Failed to cancel race' }, { status: 500 })
  }
}
