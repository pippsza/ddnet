import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPage } from '@/lib/api-auth'
import { getBotManager } from '@/services/verification/BotManager'

/** GET — fetch Docker container logs */
export async function GET(req: NextRequest) {
  try {
    const result = await requireAdminPage(req, 'container_test')
    if (result instanceof NextResponse) return result

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
