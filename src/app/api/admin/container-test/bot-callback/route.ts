import { NextRequest, NextResponse } from 'next/server'
import {
  getSession,
  addMessages,
  addDeliveries,
  popOutbox,
  updateStatus,
} from '@/lib/container-test-store'

/**
 * Bot ↔ Backend communication endpoint.
 * Auth: X-Bot-Secret header must match BACKEND_SECRET.
 *
 * POST — bot reports messages or status changes
 * GET  — bot polls for outgoing messages
 */

function verifyBotSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-bot-secret')
  return secret === process.env.BACKEND_SECRET
}

/** POST — bot sends received messages or status updates */
export async function POST(req: NextRequest) {
  if (!verifyBotSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { sessionId, type } = body

    if (!sessionId || !type) {
      return NextResponse.json({ error: 'sessionId and type required' }, { status: 400 })
    }

    const session = getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (type === 'messages') {
      const { messages, deliveries } = body
      if (Array.isArray(messages) && messages.length > 0) {
        addMessages(sessionId, messages)
      }
      if (Array.isArray(deliveries) && deliveries.length > 0) {
        addDeliveries(sessionId, deliveries)
      }
    } else if (type === 'status') {
      const { status } = body
      if (status) {
        console.log(`[ContainerTest] Bot status: session=${sessionId}, status=${status}`)
        updateStatus(sessionId, status)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ContainerTest] Bot callback error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/** GET — bot polls for messages to send */
export async function GET(req: NextRequest) {
  if (!verifyBotSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    const messages = popOutbox(sessionId)
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('[ContainerTest] Bot outbox error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
