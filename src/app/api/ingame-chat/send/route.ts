import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSession, addOutboxMessage } from '@/lib/ingame-chat-store'

/** POST — queue a whisper message for the bot to send */
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, message, recipient } = await req.json()
    if (!sessionId || !message?.trim()) {
      return NextResponse.json({ error: 'sessionId and message required' }, { status: 400 })
    }

    const session = getSession(sessionId)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status === 'stopped' || session.status === 'disconnected') {
      return NextResponse.json({ error: 'Session is no longer active' }, { status: 400 })
    }

    // recipient is optional — defaults to session.targetNick in the store
    addOutboxMessage(sessionId, message.trim(), recipient || undefined)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[InGameChat] Send error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
