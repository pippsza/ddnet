import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/services/game-actions/auth'
import { resolveGameById } from '@/services/game-actions/resolve-game'
import { handleBingoSettings } from '@/services/game-actions/settings/bingo'
import { handleRaceSettings } from '@/services/game-actions/settings/race'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ gameId: string }> }) {
  try {
    const auth = await resolveAuth(req)
    if (auth instanceof NextResponse) return auth

    const { gameId } = await params
    const resolved = await resolveGameById(auth.payload, gameId)
    if (!resolved) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

    const body = await req.json()
    const ctx = { ...auth, gameId, ...resolved }
    const isClient = req.headers.get('authorization')?.startsWith('Bearer ')
    const options = { callerSource: (isClient ? 'client' : 'web') as 'client' | 'web' }

    let result
    switch (resolved.collection) {
      case 'bingo':
      case 'kog-bingo':
        result = await handleBingoSettings(ctx, body, options)
        break
      case 'races':
      case 'kog-races':
        result = await handleRaceSettings(ctx, body, options)
        break
    }

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    console.error('[API] Error updating settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 },
    )
  }
}

// Client uses POST, web uses PATCH — same logic
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ gameId: string }> },
) {
  return PATCH(req, context)
}
