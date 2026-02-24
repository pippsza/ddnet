import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getBotManager } from '@/services/verification/BotManager'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user || (user.roles !== 'admin' && user.roles !== 'moderator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const botManager = getBotManager()

    const bot = await payload.findByID({
      collection: 'bots',
      id,
    })

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    const logs = await botManager.getBotLogs(bot.containerId, 200)
    const stats = await botManager.getBotStats(bot.containerId)

    return NextResponse.json({ bot, logs, stats })
  } catch (error: unknown) {
    console.error('[API] Error fetching bot details:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch bot' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user || (user.roles !== 'admin' && user.roles !== 'moderator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const botManager = getBotManager()

    const bot = await payload.findByID({
      collection: 'bots',
      id,
    })

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 })
    }

    await botManager.stopBot(bot.containerId)

    await payload.update({
      collection: 'bots',
      id,
      data: {
        status: 'stopped',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error stopping bot:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop bot' },
      { status: 500 },
    )
  }
}
