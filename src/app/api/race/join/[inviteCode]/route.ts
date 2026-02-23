import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  try {
    const { inviteCode } = await params
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

    // Find race by invite code
    const { docs: races } = await payload.find({
      collection: 'races',
      where: {
        inviteCode: { equals: inviteCode },
      },
      depth: 1,
      limit: 1,
    })

    if (races.length === 0) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    const race = races[0]

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

    if (race.players.length >= 4) {
      return NextResponse.json({ error: 'Race is full' }, { status: 400 })
    }

    const players = [
      ...race.players,
      {
        user: user.id,
        ingameNick: user.ingameNick,
        roundsWon: 0,
        isReady: false,
      },
    ]

    await payload.update({
      collection: 'races',
      id: race.id,
      data: { players },
    })

    // Update user's active game reference
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        activeGame: { relationTo: 'races', value: race.id },
      },
    })

    return NextResponse.json({
      success: true,
      raceId: race.id,
      message: 'Joined the race',
    })
  } catch (error: unknown) {
    console.error('[API] Error joining via invite:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join race' },
      { status: 500 },
    )
  }
}
