import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getServerLogs, getLatestLogId } from '@/lib/server-log-store'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user || (user.roles !== 'admin' && user.roles !== 'moderator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const since = parseInt(searchParams.get('since') || '0', 10)
    const level = searchParams.get('level') || undefined
    const limit = parseInt(searchParams.get('limit') || '200', 10)

    const logs = getServerLogs(since, level, limit)
    const latestId = getLatestLogId()

    return NextResponse.json({ logs, latestId })
  } catch (error: unknown) {
    console.error('[API] Error fetching server logs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch logs' },
      { status: 500 },
    )
  }
}
