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

    if (!user.isSystemVerified) {
      return NextResponse.json(
        { error: 'You must verify your nickname first' },
        { status: 400 },
      )
    }

    const race = await payload.findByID({
      collection: 'races',
      id: raceId,
      depth: 1,
    })

    if (!race) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    if (race.status !== 'waiting') {
      return NextResponse.json({ error: 'Race is not accepting players' }, { status: 400 })
    }

    // Check if already joined
    const alreadyJoined = race.players.some((p) => {
      const playerId = typeof p.user === 'string' ? p.user : p.user.id
      return playerId === user.id
    })

    if (alreadyJoined) {
      return NextResponse.json({ error: 'You are already in this race' }, { status: 400 })
    }

    // Check max players (4)
    if (race.players.length >= 4) {
      return NextResponse.json({ error: 'Race is full' }, { status: 400 })
    }

    const players = [
      ...race.players,
      {
        user: user.id,
        ingameNick: user.username,
        roundsWon: 0,
        isReady: false,
      },
    ]

    await payload.update({
      collection: 'races',
      id: raceId,
      data: { players },
    })

    return NextResponse.json({ success: true, message: 'Joined the race' })
  } catch (error: unknown) {
    console.error('[API] Error joining race:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join race' },
      { status: 500 },
    )
  }
}
