import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth } from '@/services/game-actions/auth'
import { handleCreateBingo } from '@/services/game-actions/create/bingo'
import { handleCreateRace } from '@/services/game-actions/create/race'
import { handleCreateKoGBingo } from '@/services/game-actions/create/kog-bingo'
import { handleCreateKoGRace } from '@/services/game-actions/create/kog-race'

const VALID_TYPES = ['bingo', 'race', 'kog-bingo', 'kog-race'] as const
type GameType = (typeof VALID_TYPES)[number]

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuth(req)
    if (auth instanceof NextResponse) return auth

    const body = await req.json()
    const { type } = body as { type: string }

    if (!VALID_TYPES.includes(type as GameType)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      )
    }

    const isClient = req.headers.get('authorization')?.startsWith('Bearer ')
    const options = {
      createdVia: (isClient ? 'client' : 'web') as 'client' | 'web',
      invitedPlayerId: body.invitedPlayerId,
      invitedTeammateId: body.invitedTeammateId,
      ...(type === 'race' ? { server: body.server } : {}),
    }

    let result: Awaited<ReturnType<typeof handleCreateBingo>>
    switch (type) {
      case 'bingo':
        result = await handleCreateBingo(auth, body, options)
        break
      case 'race':
        result = await handleCreateRace(auth, body, options)
        break
      case 'kog-bingo':
        result = await handleCreateKoGBingo(auth, body, options)
        break
      case 'kog-race':
        result = await handleCreateKoGRace(auth, body, options)
        break
      default:
        return NextResponse.json({ error: `Unknown game type: ${type}` }, { status: 400 })
    }

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
