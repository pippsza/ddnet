import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getBotManager } from '@/services/verification/BotManager'

/** GET — fetch Docker container logs */
export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user || user.roles !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const containerId = req.nextUrl.searchParams.get('containerId')
    if (!containerId) {
      return NextResponse.json({ error: 'containerId required' }, { status: 400 })
    }

    const botManager = getBotManager()
    const logs = await botManager.getBotLogs(containerId, 500)

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('[ContainerTest] Logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
