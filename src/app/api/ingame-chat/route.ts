import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import type { Payload } from 'payload'
import config from '@/payload.config'
import { getBotManager } from '@/services/verification/BotManager'
import { findPlayerOnline } from '@/lib/ddnet-helpers'
import {
  createSession,
  getSession,
  getSessionByUserId,
  deleteSession,
  updateStatus,
  popDeliveries,
} from '@/lib/ingame-chat-store'
import type { InGameChatSession } from '@/lib/ingame-chat-store'
import { randomUUID } from 'crypto'

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Archive session messages to DB and clean up.
 */
async function archiveSession(session: InGameChatSession, payload: Payload) {
  // Bulk-create InGameMessages
  for (const msg of session.messages) {
    await payload.create({
      collection: 'in-game-messages',
      data: {
        session: session.dbId,
        sender: msg.isServer ? 'system' : msg.isOwn ? 'user' : 'friend',
        content: msg.text,
        timestamp: msg.timestamp,
      },
      overrideAccess: true,
    })
  }

  // Update ChatSessions doc
  await payload.update({
    collection: 'chat-sessions',
    id: session.dbId,
    data: {
      status: 'disconnected',
      endedAt: new Date().toISOString(),
    },
    overrideAccess: true,
  })
}

/**
 * Stop a session: stop container, archive, update status.
 */
async function stopSession(session: InGameChatSession, payload: Payload) {
  const botManager = getBotManager()
  try {
    await botManager.stopBot(session.containerId)
  } catch (error) {
    console.error('[InGameChat] Error stopping bot:', error)
  }

  await archiveSession(session, payload)
  updateStatus(session.id, 'stopped')
  deleteSession(session.id)
}

/** POST — start an in-game chat session */
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Must be verified (admins and moderators are exempt)
    const isStaff = user.roles === 'admin' || user.roles === 'moderator'
    if (!user.isSystemVerified && !isStaff) {
      return NextResponse.json(
        { error: 'You must verify your DDNet account first' },
        { status: 403 },
      )
    }

    // Only one active session per user
    const existing = getSessionByUserId(user.id)
    if (existing) {
      return NextResponse.json(
        { error: 'You already have an active in-game chat session' },
        { status: 409 },
      )
    }

    const body = await req.json()
    const { targetUserId, targetNickname, serverPassword } = body

    let targetNick: string

    if (targetUserId) {
      // Chat with a registered user — look up their ingameNick
      const targetUser = await payload.findByID({
        collection: 'users',
        id: targetUserId,
        depth: 0,
      })
      if (!targetUser.ingameNick) {
        return NextResponse.json(
          { error: 'Player does not have an in-game nickname' },
          { status: 400 },
        )
      }
      targetNick = targetUser.ingameNick
    } else if (targetNickname) {
      // Chat with any online player by nickname
      targetNick = targetNickname
    } else {
      return NextResponse.json({ error: 'targetUserId or targetNickname required' }, { status: 400 })
    }

    // Check if target is online
    const onlineStatus = await findPlayerOnline(targetNick)
    if (!onlineStatus.online || !onlineStatus.server) {
      return NextResponse.json(
        { error: `${targetNick} is not online in-game` },
        { status: 400 },
      )
    }

    const { ip, port, name: serverName, passworded } = onlineStatus.server

    // If server is passworded and no password provided, tell frontend to ask
    if (passworded && !serverPassword) {
      return NextResponse.json(
        { error: 'passwordRequired', passworded: true, targetNick, serverName },
        { status: 428 },
      )
    }

    const sessionId = randomUUID()
    const botName = `${user.ingameNick || 'Chat'} - BOT`

    // Get user's skin for the bot avatar
    const userSkin = user.ingameStats?.skin as
      | { name?: string; colorBody?: number; colorFeet?: number; color_body?: number; color_feet?: number }
      | undefined
    const botSkin = userSkin ? {
      name: userSkin.name,
      colorBody: userSkin.colorBody ?? userSkin.color_body,
      colorFeet: userSkin.colorFeet ?? userSkin.color_feet,
    } : undefined

    console.log(
      `[InGameChat] Starting: user=${user.ingameNick}, target=${targetNick}, server=${ip}:${port}`,
    )

    // Create ChatSessions doc in DB
    const chatSessionDoc = await payload.create({
      collection: 'chat-sessions',
      data: {
        initiator: user.id,
        target: targetUserId || user.id,
        targetNickname: targetNick,
        status: 'connecting',
        server: { ip, port, name: serverName },
        startedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    // Launch bot container
    const botManager = getBotManager()
    let containerId: string
    try {
      containerId = await botManager.startIngameChatBot(
        sessionId,
        ip,
        port,
        botName,
        targetNick,
        serverPassword || undefined,
        botSkin,
      )
    } catch (error) {
      console.error('[InGameChat] Failed to start bot:', error)
      await payload.update({
        collection: 'chat-sessions',
        id: chatSessionDoc.id,
        data: { status: 'error' },
        overrideAccess: true,
      })
      return NextResponse.json(
        { error: `Failed to start bot: ${error instanceof Error ? error.message : String(error)}` },
        { status: 500 },
      )
    }

    // Update ChatSessions with container ID
    await payload.update({
      collection: 'chat-sessions',
      id: chatSessionDoc.id,
      data: { botContainerId: containerId },
      overrideAccess: true,
    })

    // Create in-memory session
    createSession(
      sessionId,
      chatSessionDoc.id,
      containerId,
      user.id,
      targetUserId || '',
      targetNick,
      ip,
      port,
      serverName,
      botName,
    )

    console.log(`[InGameChat] Session created: ${sessionId}, container: ${containerId}`)

    return NextResponse.json({
      sessionId,
      containerId,
      server: { ip, port, name: serverName },
      targetNick,
    })
  } catch (error) {
    console.error('[InGameChat] Start error:', error)
    return NextResponse.json({ error: 'Failed to start chat' }, { status: 500 })
  }
}

/** GET — poll for messages + status */
export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = req.nextUrl.searchParams.get('sessionId')
    if (!sessionId) {
      // Check if user has an active session
      const active = getSessionByUserId(user.id)
      if (active) {
        return NextResponse.json({ sessionId: active.id, status: active.status })
      }
      return NextResponse.json({ sessionId: null })
    }

    const session = getSession(sessionId)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Auto-disconnect on inactivity
    if (session.status !== 'stopped' && session.status !== 'disconnected') {
      const inactiveMs = Date.now() - new Date(session.lastActivityAt).getTime()
      if (inactiveMs > INACTIVITY_TIMEOUT_MS) {
        console.log(`[InGameChat] Auto-disconnecting stale session: ${sessionId}`)
        await stopSession(session, payload)
        return NextResponse.json({
          status: 'disconnected',
          messages: [],
          totalMessages: 0,
          targetNick: session.targetNick,
          serverName: session.serverName,
          autoDisconnected: true,
        })
      }
    }

    // Incremental polling
    const since = parseInt(req.nextUrl.searchParams.get('since') || '0', 10)
    const newMessages = session.messages.slice(since)
    const deliveries = popDeliveries(sessionId)

    return NextResponse.json({
      status: session.status,
      messages: newMessages,
      totalMessages: session.messages.length,
      deliveries,
      targetNick: session.targetNick,
      serverName: session.serverName,
      whisperParticipants: session.whisperParticipants,
    })
  } catch (error) {
    console.error('[InGameChat] GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/** DELETE — disconnect and archive */
export async function DELETE(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = req.nextUrl.searchParams.get('sessionId')
    const containerId = req.nextUrl.searchParams.get('containerId')

    // Try to find session by sessionId
    if (sessionId) {
      const session = getSession(sessionId)
      if (session && session.userId === user.id) {
        console.log(`[InGameChat] Disconnecting: session=${sessionId}`)
        await stopSession(session, payload)
        return NextResponse.json({ success: true, chatSessionId: session.dbId })
      }
    }

    // Fallback: force-stop by containerId (orphaned container after HMR)
    if (containerId) {
      console.log(`[InGameChat] Force-stopping orphaned container: ${containerId}`)
      const botManager = getBotManager()
      await botManager.forceStopContainer(containerId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  } catch (error) {
    console.error('[InGameChat] DELETE error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
