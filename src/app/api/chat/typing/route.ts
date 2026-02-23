import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { setTyping, getTypingUsers, getAllTypingForScope } from '@/lib/typing-store'

/**
 * POST /api/chat/typing — mark current user as typing
 * Body: { scope: "conversation" | "forum" | "support", scopeId: string }
 *
 * GET /api/chat/typing?scope=...&scopeId=... — get who's typing
 * Returns: { typing: [{ userId, userName }] }
 *
 * GET /api/chat/typing?scope=...&all=true — get all typing for scope
 * Returns: { typingAll: { [scopeId]: [{ userId, userName }] } }
 */

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { scope, scopeId } = await req.json()
    if (!scope || !scopeId) {
      return NextResponse.json({ error: 'scope and scopeId required' }, { status: 400 })
    }

    setTyping(scope, scopeId, user.id, user.ingameNick || user.username || 'Unknown')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scope = req.nextUrl.searchParams.get('scope')
    const all = req.nextUrl.searchParams.get('all')

    if (!scope) {
      return NextResponse.json({ error: 'scope required' }, { status: 400 })
    }

    // Bulk mode: return all typing entries for this scope
    if (all === 'true') {
      const typingAll = getAllTypingForScope(scope, user.id)
      return NextResponse.json({ typingAll })
    }

    const scopeId = req.nextUrl.searchParams.get('scopeId')
    if (!scopeId) {
      return NextResponse.json({ error: 'scopeId required' }, { status: 400 })
    }

    const typing = getTypingUsers(scope, scopeId, user.id)
    return NextResponse.json({ typing })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
