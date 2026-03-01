import { NextRequest, NextResponse } from 'next/server'
import { authenticateClientToken } from '@/lib/client-auth'

/**
 * POST /api/client/race/leave — Leave the race (non-creator only).
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
      depth: 1,
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Cannot leave after game has started' }, { status: 400 })
    }

    const creatorId = typeof game.createdBy === 'string' ? game.createdBy : game.createdBy.id
    if (user.id === creatorId) {
      return NextResponse.json({ error: 'Creator cannot leave. Use cancel instead.' }, { status: 400 })
    }

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
      collection: 'races',
      id: gameId,
      data: { teams },
    })

    await payload.update({
      collection: 'users',
      id: user.id,
      data: { activeGame: null as any },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Client race leave error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to leave race' },
      { status: 500 },
    )
  }
}
