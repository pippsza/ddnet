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

    const game = await payload.findByID({
      collection: 'bingo',
      id: gameId,
      depth: 1,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    // Only allow leaving during waiting/ready phase
    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Cannot leave after game has started' }, { status: 400 })
    }

    // Creator cannot leave — they should cancel instead
    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    if (user.id === creatorId) {
      return NextResponse.json({ error: 'Creator cannot leave. Use cancel instead.' }, { status: 400 })
    }

    // Find and remove player from their team
    const teams = JSON.parse(JSON.stringify(game.teams))
    let found = false

    for (const team of teams) {
      const before = (team.players ?? []).length
      team.players = (team.players ?? []).filter((p: any) => {
        const pid = typeof p.user === 'string' ? p.user : p.user.id
        return pid !== user.id
      })
      if ((team.players ?? []).length < before) {
        found = true
        break
      }
    }

    if (!found) {
      return NextResponse.json({ error: 'You are not in this game' }, { status: 400 })
    }

    await payload.update({
      collection: 'bingo',
      id: gameId,
      data: { teams },
    })

    // Clear user's active game
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { activeGame: null as any },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error leaving bingo game:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to leave game' },
      { status: 500 },
    )
  }
}
