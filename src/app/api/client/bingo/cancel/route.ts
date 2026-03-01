import { NextRequest, NextResponse } from 'next/server'
import { authenticateClientToken } from '@/lib/client-auth'

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateClientToken(req)
    if (authResult instanceof NextResponse) return authResult
    const { user, payload } = authResult

    const { gameId } = (await req.json()) as { gameId?: string }
    if (!gameId) {
      return NextResponse.json({ error: 'Missing gameId' }, { status: 400 })
    }

    const game = await payload.findByID({ collection: 'bingo', id: gameId, depth: 1 })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the creator can cancel this game' }, { status: 403 })
    }

    if (game.gameStatus === 'completed' || game.gameStatus === 'cancelled') {
      return NextResponse.json({ error: 'Cannot cancel a finished game' }, { status: 400 })
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
    const playerIds = (game.teams ?? []).flatMap((team: any) =>
      (team.players ?? []).map((p: any) => (typeof p.user === 'string' ? p.user : p.user.id)),
    )
    for (const playerId of playerIds) {
      await payload.update({
        collection: 'users',
        id: playerId,
        data: { activeGame: null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error cancelling bingo game (client):', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel game' },
      { status: 500 },
    )
  }
}
