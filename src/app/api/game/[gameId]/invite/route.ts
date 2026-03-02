import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/services/game-actions/auth'
import { resolveGameById } from '@/services/game-actions/resolve-game'
import { handleInvite, handleCancelInvite } from '@/services/game-actions/invite'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const auth = await resolveAuth(req)
    if (auth instanceof NextResponse) return auth

    const { gameId } = await params
    const resolved = await resolveGameById(auth.payload, gameId, 1)
    if (!resolved) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const body = await req.json()
    const result = await handleInvite({ ...auth, gameId, ...resolved }, body)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    console.error('[API] Error sending invite:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invite' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const auth = await resolveAuth(req)
    if (auth instanceof NextResponse) return auth

    const { gameId } = await params
    const resolved = await resolveGameById(auth.payload, gameId, 1)
    if (!resolved) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const body = await req.json()
    const result = await handleCancelInvite({ ...auth, gameId, ...resolved }, body)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    console.error('[API] Error cancelling invite:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel invite' },
      { status: 500 },
    )
  }
}
