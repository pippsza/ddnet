import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getBotManager } from '@/services/verification/BotManager'

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
      depth: 2,
    })

    if (!race) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    // Only creator can start
    const creatorId = typeof race.createdBy === 'string' ? race.createdBy : race.createdBy.id
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the creator can start the race' }, { status: 403 })
    }

    if (race.status !== 'ready') {
      return NextResponse.json({ error: 'Race is not ready to start' }, { status: 400 })
    }

    // Check all players ready
    const allReady = race.players.every((p) => p.isReady)
    if (!allReady) {
      return NextResponse.json({ error: 'Not all players are ready' }, { status: 400 })
    }

    // Check bot availability
    const botManager = getBotManager()
    if (!botManager.hasAvailableSlots()) {
      return NextResponse.json({ error: 'No bot slots available. Try again later.' }, { status: 503 })
    }

    // Start the race bot
    const playerNames = race.players.map((p) => p.ingameNick)

    const containerId = await botManager.startRaceBot(
      raceId,
      race.server.ip,
      race.server.port,
      playerNames,
    )

    // Update race status
    await payload.update({
      collection: 'races',
      id: raceId,
      data: {
        status: 'in_progress',
        currentRound: 1,
        startedAt: new Date().toISOString(),
        botId: containerId,
      },
    })

    // Create bot record
    await payload.create({
      collection: 'bots',
      data: {
        name: `RaceBot-${raceId.slice(0, 8)}`,
        containerId,
        mode: 'race',
        status: 'running',
        connectedServer: {
          ip: race.server.ip,
          port: race.server.port,
          name: race.server.name,
        },
        linkedGame: { relationTo: 'races', value: raceId },
        startedAt: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true, message: 'Race started!' })
  } catch (error: unknown) {
    console.error('[API] Error starting race:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start race' },
      { status: 500 },
    )
  }
}
