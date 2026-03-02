import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/services/game-actions/auth'
import { handleCreateBingo } from '@/services/game-actions/create/bingo'
import { handleCreateRace } from '@/services/game-actions/create/race'

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuth(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const { type } = body

    if (type !== 'bingo' && type !== 'race') {
      return NextResponse.json({ error: 'type must be "bingo" or "race"' }, { status: 400 })
    }

    const isClient = req.headers.get('authorization')?.startsWith('Bearer ')
    const options = {
      createdVia: (isClient ? 'client' : 'web') as 'client' | 'web',
      invitedPlayerId: body.invitedPlayerId,
      invitedTeammateId: body.invitedTeammateId,
      ...(type === 'race' ? { server: body.server } : {}),
    }

    const result = type === 'bingo'
      ? await handleCreateBingo(auth, body, options)
      : await handleCreateRace(auth, body, options)

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json(result.data)
  } catch (error: unknown) {
    console.error('[API] Error creating game:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create game' },
      { status: 500 },
    )
  }
}
