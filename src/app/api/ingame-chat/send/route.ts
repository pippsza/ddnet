import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSession, addOutboxMessage } from '@/lib/ingame-chat-store'
import { decrypt } from '@/lib/encryption'

/** POST — queue a message for the bot to send */
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

    let finalMessage = message.trim()

    // Handle auto-login with saved token
    if (finalMessage === '/login-saved') {
      const fullUser = await payload.findByID({
        collection: 'users',
        id: user.id,
        overrideAccess: true,
      })
      if (!fullUser.savedLoginToken) {
        return NextResponse.json({ error: 'No saved token' }, { status: 400 })
      }
      try {
        const decryptedToken = decrypt(fullUser.savedLoginToken)
        finalMessage = `/login ${decryptedToken}`
      } catch {
        return NextResponse.json({ error: 'Failed to decrypt saved token' }, { status: 500 })
      }
    }

    // recipient is optional — defaults to session.targetNick in the store
    addOutboxMessage(sessionId, finalMessage, recipient || undefined)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[InGameChat] Send error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
