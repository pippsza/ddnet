import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPage } from '@/lib/api-auth'
import { getBotManager } from '@/services/verification/BotManager'

export async function GET(req: NextRequest) {
  try {
    const result = await requireAdminPage(req, 'bots')
    if (result instanceof NextResponse) return result
    const { payload } = result

    const botManager = getBotManager()

    const { docs: dbBots } = await payload.find({
      overrideAccess: true,
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
