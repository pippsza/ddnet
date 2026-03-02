import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/services/game-actions/auth'
import { resolveGameById } from '@/services/game-actions/resolve-game'
import { handleRematch } from '@/services/game-actions/rematch'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const auth = await resolveAuth(req, 'web')
    if (auth instanceof NextResponse) return auth

    const { gameId } = await params
    const resolved = await resolveGameById(auth.payload, gameId, 1)
    if (!resolved) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const result = await handleRematch({ ...auth, gameId, ...resolved })
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    console.error('[API] Error creating rematch:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create rematch' },
      { status: 500 },
    )
  }
}
