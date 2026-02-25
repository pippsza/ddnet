import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getBotManager } from '@/services/verification/BotManager'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { raceId } = await params

    const race = await payload.findByID({
      collection: 'races',
      id: raceId,
      depth: 1,
    })

    if (!race) {
      return NextResponse.json({ error: 'Race not found' }, { status: 404 })
    }

    const creatorId =
      typeof race.createdBy === 'string' ? race.createdBy : race.createdBy.id
    if (creatorId !== user.id) {
      return NextResponse.json({ error: 'Only the creator can cancel this race' }, { status: 403 })
    }

    if (race.status === 'completed' || race.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot cancel a completed race' }, { status: 400 })
    }

    // Stop the monitoring bot if running
    if (race.botId) {
      try {
        const botManager = getBotManager()
        await botManager.stopBot(race.botId)
      } catch {
        // Bot may already be stopped
      }
    }

    await payload.update({
      collection: 'races',
      id: raceId,
      data: {
        status: 'cancelled',
        isPublic: false,
        completedAt: new Date().toISOString(),
      },
    })

    // Clear activeGame for all players in this race
    const playerIds = (race.players ?? []).map((p) =>
      typeof p.user === 'string' ? p.user : p.user.id,
    )
    for (const playerId of playerIds) {
      await payload.update({
        collection: 'users',
        id: playerId,
        data: { activeGame: null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error cancelling race:', error)
    return NextResponse.json({ error: 'Failed to cancel race' }, { status: 500 })
  }
}
