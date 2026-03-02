import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/services/game-actions/auth'
import { resolveGameById } from '@/services/game-actions/resolve-game'
import { handleJoin } from '@/services/game-actions/join'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const auth = await resolveAuth(req)
    if (auth instanceof NextResponse) return auth

    const { gameId } = await params
    const resolved = await resolveGameById(auth.payload, gameId)
    if (!resolved) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    // Race requires verified nickname
    if (resolved.collection === 'races' && !auth.user.isSystemVerified) {
      return NextResponse.json({ error: 'You must verify your nickname first' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const result = await handleJoin({ ...auth, gameId, ...resolved }, body.teamIndex)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    console.error('[API] Error joining game:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to join game' },
      { status: 500 },
    )
  }
}
