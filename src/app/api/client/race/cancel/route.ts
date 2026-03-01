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

    await payload.update({
      collection: 'races',
      id: gameId,
      data: {
        gameStatus: 'cancelled',
        isPublic: false,
        completedAt: new Date().toISOString(),
      },
    })

    // Don't clear activeGame here — let clients see the cancelled state
    // and trigger appropriate UI transitions. activeGame is auto-cleared
    // when users create a new game (stale ref handling).

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error cancelling race (client):', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel race' },
      { status: 500 },
    )
  }
}
