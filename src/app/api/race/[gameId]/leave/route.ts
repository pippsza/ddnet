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

    if (game.gameStatus !== 'waiting' && game.gameStatus !== 'ready') {
      return NextResponse.json({ error: 'Cannot leave after race has started' }, { status: 400 })
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
      return NextResponse.json({ error: 'You are not in this race' }, { status: 400 })
    }

    await payload.update({ collection: 'races', id: gameId, data: { teams } })
    await payload.update({ collection: 'users', id: user.id, data: { activeGame: null as any } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error leaving race:', error)
    return NextResponse.json({ error: error.message || 'Failed to leave race' }, { status: 500 })
  }
}
