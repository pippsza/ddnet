import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/services/game-actions/auth'
import { resolveGameById } from '@/services/game-actions/resolve-game'
import { handleStartSimple } from '@/services/game-actions/start'
import { handleStartRaceWeb } from '@/services/game-actions/start-race-web'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const auth = await resolveAuth(req)
    if (auth instanceof NextResponse) return auth

    const { gameId } = await params
    const resolved = await resolveGameById(auth.payload, gameId)
    if (!resolved) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const ctx = { ...auth, gameId, ...resolved }
    const result = resolved.collection === 'bingo'
      ? await handleStartSimple(ctx)
      : await handleStartRaceWeb(ctx)

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    console.error('[API] Error starting game:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start game' },
      { status: 500 },
    )
  }
}
