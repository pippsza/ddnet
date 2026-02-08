import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> },
) {
  try {
    const { raceId } = await params
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const race = await payload.findByID({
      collection: 'races',
      id: raceId,
      depth: 1,
    })

    if (!race) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    if (race.status !== 'waiting' && race.status !== 'ready') {
      return NextResponse.json({ error: 'Cannot toggle ready in current state' }, { status: 400 })
    }

    // Find player and toggle ready
    const players = race.players.map((p) => {
      const playerId = typeof p.user === 'string' ? p.user : p.user.id
      if (playerId === user.id) {
        return { ...p, isReady: !p.isReady }
      }
      return p
    })

    // Check if all players are ready
    const allReady = players.every((p) => p.isReady)
    const newStatus = allReady ? 'ready' : 'waiting'

    await payload.update({
      collection: 'races',
      id: raceId,
      data: { players, status: newStatus },
    })

    return NextResponse.json({
      success: true,
      allReady,
      status: newStatus,
    })
  } catch (error: unknown) {
    console.error('[API] Error toggling ready:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle ready' },
      { status: 500 },
    )
  }
}
