import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/services/game-actions/auth'
import { resolveGameById } from '@/services/game-actions/resolve-game'
import { handleCancel } from '@/services/game-actions/cancel'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const auth = await resolveAuth(req)
    if (auth instanceof NextResponse) return auth

    const { gameId } = await params
    const resolved = await resolveGameById(auth.payload, gameId)
    if (!resolved) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const result = await handleCancel({ ...auth, gameId, ...resolved })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    console.error('[API] Error cancelling game:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel game' },
      { status: 500 },
    )
  }
}
