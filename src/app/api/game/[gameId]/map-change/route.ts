import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { resolveGameById } from '@/services/game-actions/resolve-game'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    // Verify bot secret
    const botSecret = req.headers.get('X-Bot-Secret')
    if (botSecret !== process.env.BACKEND_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { gameId } = await params
    const { mapName } = await req.json()

    if (!mapName) {
      return NextResponse.json({ error: 'Missing mapName' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Resolve which collection this game belongs to
    const resolved = await resolveGameById(payload, gameId, 0)
    if (!resolved) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    await payload.update({
      collection: resolved.collection,
      id: gameId,
      data: { currentMap: mapName },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error updating map:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update map' },
      { status: 500 },
    )
  }
}
