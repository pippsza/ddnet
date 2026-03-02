import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/services/game-actions/auth'
import { resolveGameById } from '@/services/game-actions/resolve-game'
import { handleSwitchTeam } from '@/services/game-actions/switch-team'

export async function POST(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const auth = await resolveAuth(req)
    if (auth instanceof NextResponse) return auth

    const { gameId } = await params
    const resolved = await resolveGameById(auth.payload, gameId)
    if (!resolved) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const { targetTeamIndex } = await req.json()
    const result = await handleSwitchTeam({ ...auth, gameId, ...resolved }, targetTeamIndex)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    console.error('[API] Error switching team:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to switch team' },
      { status: 500 },
    )
  }
}
