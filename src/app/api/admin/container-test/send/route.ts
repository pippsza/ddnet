import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getSession, addOutboxMessage } from '@/lib/container-test-store'

/** POST — queue a message for the bot to send */
export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user || user.roles !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { sessionId, message } = await req.json()
    if (!sessionId || !message) {
      return NextResponse.json({ error: 'sessionId and message required' }, { status: 400 })
    }

    const session = getSession(sessionId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    addOutboxMessage(sessionId, message)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ContainerTest] Send error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
