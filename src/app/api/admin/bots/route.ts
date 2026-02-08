import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getBotManager } from '@/services/verification/BotManager'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user || user.roles !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const botManager = getBotManager()

    const { docs: dbBots } = await payload.find({
      collection: 'bots',
      where: { status: { in: ['starting', 'running'] } },
      sort: '-createdAt',
      limit: 100,
    })

    const activeBots = botManager.getActiveBots()

    return NextResponse.json({
      totalSlots: parseInt(process.env.MAX_BOTS || '10'),
      activeCount: botManager.getActiveCount(),
      bots: dbBots.map((bot) => ({
        ...bot,
        isActive: activeBots.some((a) => a.containerId === bot.containerId),
      })),
    })
  } catch (error: unknown) {
    console.error('[API] Error fetching bots:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch bots' },
      { status: 500 },
    )
  }
}
