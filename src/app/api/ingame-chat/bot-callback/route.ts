import { NextRequest, NextResponse } from 'next/server'
import {
  getSession,
  addMessages,
  addDeliveries,
  addWhisperParticipant,
  popOutbox,
  updateStatus,
} from '@/lib/ingame-chat-store'
import type { InGameChatMessage } from '@/lib/ingame-chat-store'

/**
 * Bot ↔ Backend communication for in-game chat.
 * Auth: X-Bot-Secret header.
 */

function verifyBotSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-bot-secret')
  return secret === process.env.BACKEND_SECRET
}

/** POST — bot reports received messages or status changes */
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
        // Track unique message authors as whisper participants
        for (const msg of messages as InGameChatMessage[]) {
          if (!msg.isServer && !msg.isOwn && msg.author) {
            addWhisperParticipant(sessionId, msg.author)
          }
        }
      }
      if (Array.isArray(deliveries) && deliveries.length > 0) {
        addDeliveries(sessionId, deliveries)
      }
    } else if (type === 'status') {
      const { status } = body
      if (status) {
        console.log(`[InGameChat] Bot status: session=${sessionId}, status=${status}`)
        updateStatus(sessionId, status)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[InGameChat] Bot callback error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

/** GET — bot polls for messages to send (whisper) */
export async function GET(req: NextRequest) {
  if (!verifyBotSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
    }

    // Returns Array<{ recipient, message }>
    const messages = popOutbox(sessionId)
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('[InGameChat] Bot outbox error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
