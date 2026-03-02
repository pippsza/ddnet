import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/services/game-actions/auth'
import { resolveGameById } from '@/services/game-actions/resolve-game'
import { handleSurrender } from '@/services/game-actions/surrender'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const auth = await resolveAuth(req)
    if (auth instanceof NextResponse) return auth

    const { gameId } = await params
    const resolved = await resolveGameById(auth.payload, gameId)
    if (!resolved) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const result = await handleSurrender({ ...auth, gameId, ...resolved })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    console.error('[API] Error surrendering game:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to surrender game' },
      { status: 500 },
    )
  }
}
