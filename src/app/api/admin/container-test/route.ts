import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPage } from '@/lib/api-auth'
import { getBotManager } from '@/services/verification/BotManager'
import {
  createSession,
  getSession,
  getActiveSession,
  deleteSession,
  updateStatus,
  popDeliveries,
} from '@/lib/container-test-store'
import { randomUUID } from 'crypto'

/** POST — start a test bot */
export async function POST(req: NextRequest) {
  try {
    const result = await requireAdminPage(req, 'container_test')
    if (result instanceof NextResponse) return result
    const { payload } = result

    // Only one test session at a time
    const existing = getActiveSession()
    if (existing) {
      return NextResponse.json(
        { error: 'A test session is already running. Stop it first.' },
        { status: 409 },
      )
    }

    const body = await req.json()
    const { serverIp, serverPort, botName, serverPassword } = body

    if (!serverIp || !serverPort) {
      return NextResponse.json({ error: 'serverIp and serverPort required' }, { status: 400 })
    }

    const sessionId = randomUUID()
    const name = botName || 'TestBot'
    const botManager = getBotManager()

    console.log(`[ContainerTest] Starting test bot: session=${sessionId}, server=${serverIp}:${serverPort}, name=${name}`)

    let containerId: string
    try {
      containerId = await botManager.startTestBot(sessionId, serverIp, parseInt(serverPort, 10), name, serverPassword || undefined)
    } catch (error) {
      console.error('[ContainerTest] Failed to start bot:', error)
      return NextResponse.json(
        { error: `Failed to start bot: ${error instanceof Error ? error.message : String(error)}` },
        { status: 500 },
      )
    }

    const session = createSession(sessionId, containerId, serverIp, parseInt(serverPort, 10), name)
    console.log(`[ContainerTest] Session created: ${sessionId}, container: ${containerId}`)

    return NextResponse.json({
      sessionId: session.id,
      containerId: session.containerId,
    })
  } catch (error) {
    console.error('[ContainerTest] Start error:', error)
    return NextResponse.json({ error: 'Failed to start test' }, { status: 500 })
  }
}

/** GET — get session status + messages */
export async function GET(req: NextRequest) {
  try {
    const result = await requireAdminPage(req, 'container_test')
    if (result instanceof NextResponse) return result

    const sessionId = req.nextUrl.searchParams.get('sessionId')

    // If no sessionId, return active session info
    if (!sessionId) {
      const active = getActiveSession()
      if (!active) {
        return NextResponse.json({ session: null })
      }
      return NextResponse.json({
        session: {
          id: active.id,
          containerId: active.containerId,
          serverIp: active.serverIp,
          serverPort: active.serverPort,
          botName: active.botName,
          status: active.status,
          startedAt: active.startedAt,
          messageCount: active.messages.length,
        },
      })
    }

    const session = getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Support incremental polling with ?since=index
    const since = parseInt(req.nextUrl.searchParams.get('since') || '0', 10)
    const newMessages = session.messages.slice(since)
    const deliveries = popDeliveries(sessionId)

    return NextResponse.json({
      status: session.status,
      messages: newMessages,
      totalMessages: session.messages.length,
      deliveries,
      serverIp: session.serverIp,
      serverPort: session.serverPort,
      botName: session.botName,
    })
  } catch (error) {
    console.error('[ContainerTest] GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/** DELETE — stop test bot (by sessionId or containerId) */
export async function DELETE(req: NextRequest) {
  try {
    const result = await requireAdminPage(req, 'container_test')
    if (result instanceof NextResponse) return result

    const sessionId = req.nextUrl.searchParams.get('sessionId')
    const containerId = req.nextUrl.searchParams.get('containerId')

    const botManager = getBotManager()

    // Try to find session and stop via session
    if (sessionId) {
      const session = getSession(sessionId)
      if (session) {
        console.log(`[ContainerTest] Stopping via session: ${sessionId}, container: ${session.containerId}`)
        try {
          await botManager.stopBot(session.containerId)
        } catch (error) {
          console.error('[ContainerTest] Error stopping bot:', error)
        }
        updateStatus(sessionId, 'stopped')
        deleteSession(sessionId)
        return NextResponse.json({ success: true })
      }
    }

    // Fallback: stop by containerId directly (orphaned container)
    if (containerId) {
      console.log(`[ContainerTest] Force-stopping orphaned container: ${containerId}`)
      await botManager.forceStopContainer(containerId)
      // Also clean up any session that might reference this container
      const active = getActiveSession()
      if (active?.containerId === containerId) {
        deleteSession(active.id)
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'sessionId or containerId required' }, { status: 400 })
  } catch (error) {
    console.error('[ContainerTest] DELETE error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
